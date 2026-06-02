"""
Jobs router: create/read/update/delete jobs and trigger requirement extraction.
Also handles CV upload, leaderboard, batch status, and export.
"""

import asyncio
import logging
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db import AsyncSessionLocal, get_session
from app.models import Candidate, Job, Requirement
from app.schemas import (
    BatchStatusOut,
    CategoryScoreOut,
    JobCreate,
    JobListItem,
    JobOut,
    JobUpdate,
    LeaderboardEntry,
)
from app.services.export import generate_shortlist_csv
from app.services.parsing import ParsingError, extract_text
from app.services.scoring import process_job_candidates

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
async def list_jobs(session: AsyncSession = Depends(get_session)) -> list[JobListItem]:
    result = await session.execute(select(Job).order_by(Job.created_at.desc()))
    jobs = result.scalars().all()

    # Count candidates per job efficiently
    count_result = await session.execute(
        select(Candidate.job_id, func.count(Candidate.id)).group_by(Candidate.job_id)
    )
    counts: dict[int, int] = {job_id: int(cnt) for job_id, cnt in count_result.all()}

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

    for file in files:
        content = await file.read()
        filename = file.filename or "upload"

        try:
            text = extract_text(filename, content)
        except ParsingError as e:
            errors.append({"filename": filename, "error": str(e)})
            continue

        # Use filename stem as initial name; Claude will extract the real name during scoring
        name = Path(filename).stem.replace("_", " ").replace("-", " ").title()

        candidate = Candidate(
            job_id=job_id,
            name=name,
            original_filename=filename,
            raw_text=text,
            status="pending",
        )
        session.add(candidate)
        await session.flush()  # get the ID before background task
        candidate_ids.append(candidate.id)

    await session.commit()

    if candidate_ids:
        asyncio.create_task(process_job_candidates(candidate_ids, AsyncSessionLocal))

    return {
        "queued": len(candidate_ids),
        "candidate_ids": candidate_ids,
        "errors": errors,
    }


# ── Leaderboard ───────────────────────────────────────────────────────────────


@router.get("/{job_id}/candidates", response_model=list[LeaderboardEntry])
async def get_leaderboard(
    job_id: int,
    session: AsyncSession = Depends(get_session),
) -> list[LeaderboardEntry]:
    """
    Returns ranked leaderboard for a job. Polled by the frontend.
    Only done candidates are ranked; pending/processing/error appear at the bottom.
    """
    await _get_job_or_404(job_id, session)

    result = await session.execute(
        select(Candidate)
        .options(selectinload(Candidate.evaluation))
        .where(Candidate.job_id == job_id)
    )
    candidates = result.scalars().all()

    done = sorted(
        [c for c in candidates if c.status == "done" and c.evaluation],
        key=lambda c: c.evaluation.overall_score if c.evaluation else 0.0,
        reverse=True,
    )
    others = [c for c in candidates if c not in done]

    entries: list[LeaderboardEntry] = []
    for rank, cand in enumerate(done, 1):
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
            )
        )

    for cand in others:
        entries.append(
            LeaderboardEntry(
                rank=len(done) + 1,
                id=cand.id,
                name=cand.name,
                original_filename=cand.original_filename,
                status=cand.status,
                overall_score=None,
                category_scores=None,
                recommendation=None,
                summary=None,
            )
        )

    return entries


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
    counts: dict[str, int] = {status: int(cnt) for status, cnt in result.all()}
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
