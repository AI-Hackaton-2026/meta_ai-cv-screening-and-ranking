"""
Candidates router: detail view, rescore, per-candidate PDF export.
"""

import asyncio
import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db import AsyncSessionLocal, get_session
from app.models import Candidate, Evaluation
from app.schemas import CandidateOut, CategoryScoreOut, EvaluationOut, RequirementMatchOut
from app.services.export import generate_candidate_pdf
from app.services.scoring import score_candidate
from app.services.storage import StorageError, delete_cvs, download_cv

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/candidates", tags=["candidates"])


async def _get_candidate_with_eval(candidate_id: int, session: AsyncSession) -> Candidate:
    result = await session.execute(
        select(Candidate)
        .options(selectinload(Candidate.evaluation))
        .where(Candidate.id == candidate_id)
    )
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate


def _build_eval_out(ev: Evaluation) -> EvaluationOut:
    cs = {
        k: CategoryScoreOut(score=v["score"], rationale=v["rationale"])
        for k, v in (ev.category_scores or {}).items()
    }
    rm = [
        RequirementMatchOut(
            requirement_id=m["requirement_id"],
            status=m["status"],
            evidence=m["evidence"],
        )
        for m in (ev.requirement_matches or [])
    ]
    return EvaluationOut(
        id=ev.id,
        overall_score=ev.overall_score,
        category_scores=cs,
        requirement_matches=rm,
        strengths=ev.strengths or [],
        gaps=ev.gaps or [],
        recommendation=ev.recommendation,
        summary=ev.summary,
        reasoning=ev.reasoning,
        model=ev.model,
        created_at=ev.created_at,
    )


@router.get("/{candidate_id}", response_model=CandidateOut)
async def get_candidate(
    candidate_id: int,
    session: AsyncSession = Depends(get_session),
) -> CandidateOut:
    candidate = await _get_candidate_with_eval(candidate_id, session)
    ev_out = _build_eval_out(candidate.evaluation) if candidate.evaluation else None

    return CandidateOut(
        id=candidate.id,
        job_id=candidate.job_id,
        name=candidate.name,
        original_filename=candidate.original_filename,
        has_cv_preview=bool(candidate.storage_path),
        status=candidate.status,
        error=candidate.error,
        uploaded_at=candidate.uploaded_at,
        evaluation=ev_out,
    )


@router.delete("/{candidate_id}", status_code=204)
async def delete_candidate(
    candidate_id: int,
    session: AsyncSession = Depends(get_session),
) -> None:
    candidate = await session.get(Candidate, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    if candidate.storage_path:
        try:
            await delete_cvs([candidate.storage_path])
        except StorageError:
            logger.exception("Could not delete stored CV for candidate %s", candidate_id)
            raise HTTPException(
                status_code=502, detail="Could not delete CV file from Supabase Storage"
            ) from None

    await session.delete(candidate)
    await session.commit()


@router.post("/{candidate_id}/rescore", status_code=202)
async def rescore_candidate(
    candidate_id: int,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """
    Re-run Claude scoring for a candidate (e.g. after editing job weights).
    Returns immediately; the caller should poll the leaderboard for the result.
    """
    candidate = await session.get(Candidate, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    if candidate.status == "processing":
        return {"message": "Already processing", "candidate_id": candidate_id}

    # Reset status so the UI shows it's in progress
    candidate.status = "pending"
    await session.commit()

    asyncio.create_task(score_candidate(candidate_id, AsyncSessionLocal))

    return {"message": "Rescore queued", "candidate_id": candidate_id}


@router.get("/{candidate_id}/cv-preview")
async def preview_candidate_cv(
    candidate_id: int,
    session: AsyncSession = Depends(get_session),
) -> Response:
    """Return a browser-friendly preview without exposing private Storage credentials."""
    candidate = await session.get(Candidate, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    if not candidate.storage_path:
        raise HTTPException(status_code=404, detail="Original CV file is not available")

    if candidate.original_filename.lower().endswith(".docx"):
        return PlainTextResponse(candidate.raw_text)

    try:
        content, content_type = await download_cv(candidate.storage_path)
    except StorageError:
        logger.exception("Could not load stored CV for candidate %s", candidate_id)
        raise HTTPException(
            status_code=502, detail="Could not load CV file from Supabase Storage"
        ) from None

    return Response(
        content=content,
        media_type=content_type,
        headers={"Content-Disposition": 'inline; filename="candidate-cv.pdf"'},
    )


@router.get("/{candidate_id}/export")
async def export_candidate(
    candidate_id: int,
    format: str = "pdf",
    session: AsyncSession = Depends(get_session),
) -> Response:
    candidate = await _get_candidate_with_eval(candidate_id, session)

    if not candidate.evaluation:
        raise HTTPException(status_code=404, detail="No evaluation found for this candidate")

    if format == "pdf":
        pdf_bytes = generate_candidate_pdf(candidate)
        safe_name = candidate.name.lower().replace(" ", "_")[:40]
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{safe_name}_evaluation.pdf"'},
        )

    raise HTTPException(status_code=400, detail=f"Unsupported format: {format}")
