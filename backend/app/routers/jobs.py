"""
Jobs router: create/read/update/delete jobs and trigger requirement extraction.
Also handles CV upload, leaderboard, batch status, and export.
"""

import asyncio
import logging
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile
from fastapi.responses import Response
from sqlalchemy import and_, asc, desc, func, not_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.db import AsyncSessionLocal, get_session
from app.models import Candidate, Evaluation, Job, Requirement
from app.schemas import (
    BatchStatusOut,
    CategoryScoreOut,
    JobCreate,
    JobListItem,
    JobOut,
    JobUpdate,
    LeaderboardEntry,
    LeaderboardPage,
)
from app.services.contact import extract_email
from app.services.export import generate_shortlist_csv
from app.services.parsing import ParsingError, extract_text
from app.services.scoring import process_job_candidates
from app.services.storage import StorageError, delete_cvs, upload_cv

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/jobs", tags=["jobs"])


# ── Helpers ───────────────────────────────────────────────────────────────────


async def _get_job_or_404(job_id: int, session: AsyncSession) -> Job:
    job = await session.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


async def _trigger_extraction(job_id: int) -> None:
    """Background task: extract requirements and update job in DB."""
    from app.services.claude import extract_requirements

    async with AsyncSessionLocal() as session:
        job = await session.get(Job, job_id)
        if not job:
            return
        job.extraction_status = "extracting"
        await session.commit()

    async with AsyncSessionLocal() as session:
        job = await session.get(Job, job_id)
        if not job:
            return
        try:
            result = await extract_requirements(job)

            # Persist requirements
            for item in result.must_have:
                session.add(
                    Requirement(
                        job_id=job_id,
                        text=item.text,
                        kind="must_have",
                        category=item.category,
                    )
                )
            for item in result.nice_to_have:
                session.add(
                    Requirement(
                        job_id=job_id,
                        text=item.text,
                        kind="nice_to_have",
                        category=item.category,
                    )
                )

            job.category_weights = result.suggested_weights
            job.extraction_status = "done"
            job.extraction_error = None
            await session.commit()

        except Exception as e:
            logger.exception("Requirement extraction failed for job %s", job_id)
            job.extraction_status = "error"
            job.extraction_error = str(e)[:500]
            await session.commit()


# ── Endpoints ─────────────────────────────────────────────────────────────────


@router.post("", response_model=JobOut, status_code=201)
async def create_job(
    body: JobCreate,
    session: AsyncSession = Depends(get_session),
) -> JobOut:
    job = Job(title=body.title, description=body.description)
    session.add(job)
    await session.commit()
    await session.refresh(job)

    # Kick off requirement extraction as a background task
    asyncio.create_task(_trigger_extraction(job.id))

    # IMPORTANT: avoid async lazy-loading relationships during Pydantic validation
    # (can raise MissingGreenlet). Re-query with requirements eagerly loaded.
    result = await session.execute(
        select(Job).options(selectinload(Job.requirements)).where(Job.id == job.id)
    )
    job_with_requirements = result.scalar_one()
    return JobOut.model_validate(job_with_requirements)


@router.get("", response_model=list[JobListItem])
async def list_jobs(
    search: str | None = Query(default=None, max_length=200),
    session: AsyncSession = Depends(get_session),
) -> list[JobListItem]:
    search_term = search.strip() if search else None
    statement = select(Job)
    if search_term:
        statement = statement.where(Job.title.ilike(f"%{search_term}%"))

    result = await session.execute(statement.order_by(Job.created_at.desc()))
    jobs = result.scalars().all()

    # Count candidates per job efficiently
    count_result = await session.execute(
        select(Candidate.job_id, func.count(Candidate.id)).group_by(Candidate.job_id)
    )
    counts = {int(job_id): int(count) for job_id, count in count_result.tuples().all()}

    items = []
    for job in jobs:
        items.append(
            JobListItem(
                id=job.id,
                title=job.title,
                extraction_status=job.extraction_status,
                created_at=job.created_at,
                candidate_count=counts.get(job.id, 0),
            )
        )
    return items


@router.get("/{job_id}", response_model=JobOut)
async def get_job(
    job_id: int,
    session: AsyncSession = Depends(get_session),
) -> JobOut:
    result = await session.execute(
        select(Job).options(selectinload(Job.requirements)).where(Job.id == job_id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobOut.model_validate(job)


@router.patch("/{job_id}", response_model=JobOut)
async def update_job(
    job_id: int,
    body: JobUpdate,
    session: AsyncSession = Depends(get_session),
) -> JobOut:
    job = await _get_job_or_404(job_id, session)

    if body.title is not None:
        job.title = body.title
    if body.description is not None:
        job.description = body.description
    if body.category_weights is not None:
        total = sum(body.category_weights.values())
        if total != 100:
            raise HTTPException(status_code=422, detail="Weights must sum to 100")
        job.category_weights = body.category_weights

    await session.commit()

    result = await session.execute(
        select(Job).options(selectinload(Job.requirements)).where(Job.id == job_id)
    )
    job = result.scalar_one()
    return JobOut.model_validate(job)


@router.delete("/{job_id}", status_code=204)
async def delete_job(
    job_id: int,
    session: AsyncSession = Depends(get_session),
) -> None:
    job = await _get_job_or_404(job_id, session)
    result = await session.execute(select(Candidate.storage_path).where(Candidate.job_id == job_id))
    storage_paths = [path for path in result.scalars().all() if path]

    if storage_paths:
        try:
            await delete_cvs(storage_paths)
        except StorageError:
            logger.exception("Could not delete stored CVs for job %s", job_id)
            raise HTTPException(
                status_code=502, detail="Could not delete CV files from Supabase Storage"
            ) from None

    await session.delete(job)
    await session.commit()


# ── CV Upload ─────────────────────────────────────────────────────────────────


@router.post("/{job_id}/candidates", status_code=202)
async def upload_candidates(
    job_id: int,
    files: list[UploadFile],
    session: AsyncSession = Depends(get_session),
) -> dict:
    """
    Upload 1..N CV files (PDF/DOCX). Parses text, creates Candidate rows,
    and enqueues background scoring. Returns immediately with candidate IDs.
    """
    await _get_job_or_404(job_id, session)

    if not files:
        raise HTTPException(status_code=422, detail="At least one file is required")

    candidate_ids: list[int] = []
    errors: list[dict] = []
    uploaded_paths: list[str] = []

    try:
        for file in files:
            content = await file.read()
            filename = file.filename or "upload"

            try:
                text = extract_text(filename, content)
            except ParsingError as e:
                errors.append({"filename": filename, "error": str(e)})
                continue

            storage_path = None
            if settings.supabase_storage_enabled:
                try:
                    storage_path = await upload_cv(
                        job_id,
                        filename,
                        content,
                        file.content_type or "application/octet-stream",
                    )
                    uploaded_paths.append(storage_path)
                except StorageError as e:
                    errors.append({"filename": filename, "error": str(e)})
                    continue

            # Use filename stem as initial name; Claude will extract the real name during scoring
            name = Path(filename).stem.replace("_", " ").replace("-", " ").title()
            email = extract_email(text)

            candidate = Candidate(
                job_id=job_id,
                name=name,
                email=email,
                original_filename=filename,
                storage_path=storage_path,
                raw_text=text,
                status="pending",
            )
            session.add(candidate)
            await session.flush()  # get the ID before background task
            candidate_ids.append(candidate.id)

        await session.commit()
    except Exception:
        await session.rollback()
        if uploaded_paths:
            try:
                await delete_cvs(uploaded_paths)
            except StorageError:
                logger.exception("Could not clean up CVs after database upload failure")
        raise

    if candidate_ids:
        asyncio.create_task(process_job_candidates(candidate_ids, AsyncSessionLocal))

    return {
        "queued": len(candidate_ids),
        "stored": len(uploaded_paths),
        "storage_enabled": settings.supabase_storage_enabled,
        "candidate_ids": candidate_ids,
        "errors": errors,
    }


# ── Leaderboard ───────────────────────────────────────────────────────────────


@router.get("/{job_id}/candidates", response_model=LeaderboardPage)
async def get_leaderboard(
    job_id: int,
    search: str | None = Query(default=None, max_length=200),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=1000),
    sort_dir: str = Query(default="desc", pattern="^(asc|desc)$"),
    session: AsyncSession = Depends(get_session),
) -> LeaderboardPage:
    """
    Returns an offset-paginated leaderboard for a job. Polled by the frontend.
    Search and pagination are applied on the backend.
    """
    await _get_job_or_404(job_id, session)

    search_term = search.strip() if search else None
    filters = [Candidate.job_id == job_id]
    if search_term:
        needle = f"%{search_term}%"
        filters.append(Candidate.name.ilike(needle))

    done_filter = [*filters, Candidate.status == "done"]
    others_filter = [
        *filters,
        not_(and_(Candidate.status == "done", Evaluation.id.is_not(None))),
    ]

    done_count_result = await session.execute(
        select(func.count(Candidate.id)).join(Evaluation).where(*done_filter)
    )
    done_count = done_count_result.scalar_one()

    others_count_result = await session.execute(
        select(func.count(Candidate.id)).outerjoin(Evaluation).where(*others_filter)
    )
    others_count = others_count_result.scalar_one()
    total = done_count + others_count

    score_order = (
        asc(Evaluation.overall_score) if sort_dir == "asc" else desc(Evaluation.overall_score)
    )
    page_candidates: list[tuple[int, Candidate]] = []

    if offset < done_count:
        done_limit = min(limit, done_count - offset)
        done_result = await session.execute(
            select(Candidate)
            .join(Evaluation)
            .options(selectinload(Candidate.evaluation))
            .where(*done_filter)
            .order_by(score_order, Candidate.uploaded_at.desc(), Candidate.id.desc())
            .offset(offset)
            .limit(done_limit)
        )
        page_candidates.extend(
            (offset + index + 1, candidate)
            for index, candidate in enumerate(done_result.scalars().all())
        )

    remaining = limit - len(page_candidates)
    if remaining > 0:
        others_offset = max(offset - done_count, 0)
        others_result = await session.execute(
            select(Candidate)
            .outerjoin(Evaluation)
            .options(selectinload(Candidate.evaluation))
            .where(*others_filter)
            .order_by(Candidate.uploaded_at.desc(), Candidate.id.desc())
            .offset(others_offset)
            .limit(remaining)
        )
        page_candidates.extend(
            (done_count + 1, candidate) for candidate in others_result.scalars().all()
        )

    entries: list[LeaderboardEntry] = []
    for rank, cand in page_candidates:
        ev = cand.evaluation
        cs = (
            {
                k: CategoryScoreOut(score=v["score"], rationale=v["rationale"])
                for k, v in (ev.category_scores or {}).items()
            }
            if ev
            else None
        )
        entries.append(
            LeaderboardEntry(
                rank=rank,
                id=cand.id,
                name=cand.name,
                original_filename=cand.original_filename,
                status=cand.status,
                overall_score=ev.overall_score if ev else None,
                category_scores=cs,
                recommendation=ev.recommendation if ev else None,
                summary=ev.summary if ev else None,
                error=cand.error,
            )
        )

    return LeaderboardPage(
        items=entries,
        total=total,
        offset=offset,
        limit=limit,
        search=search_term,
    )


@router.get("/{job_id}/status", response_model=BatchStatusOut)
async def get_batch_status(
    job_id: int,
    session: AsyncSession = Depends(get_session),
) -> BatchStatusOut:
    await _get_job_or_404(job_id, session)

    result = await session.execute(
        select(Candidate.status, func.count(Candidate.id))
        .where(Candidate.job_id == job_id)
        .group_by(Candidate.status)
    )
    counts = {str(status): int(count) for status, count in result.tuples().all()}
    total = sum(counts.values())

    return BatchStatusOut(
        total=total,
        pending=counts.get("pending", 0),
        processing=counts.get("processing", 0),
        done=counts.get("done", 0),
        error=counts.get("error", 0),
    )


# ── Export ────────────────────────────────────────────────────────────────────


@router.get("/{job_id}/export")
async def export_job(
    job_id: int,
    format: str = "csv",
    session: AsyncSession = Depends(get_session),
) -> Response:
    result = await session.execute(
        select(Job)
        .options(selectinload(Job.candidates).selectinload(Candidate.evaluation))
        .where(Job.id == job_id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if format == "csv":
        csv_bytes = generate_shortlist_csv(job, job.candidates)
        safe_title = job.title.lower().replace(" ", "_")[:40]
        return Response(
            content=csv_bytes,
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{safe_title}_shortlist.csv"'},
        )

    raise HTTPException(status_code=400, detail=f"Unsupported format: {format}")
