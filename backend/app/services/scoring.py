"""
Scoring and batch orchestration.

compute_overall_score(category_scores, weights) -> float
  Deterministic weighted average — transparent and recruiter-tunable.

score_candidate(candidate_id, session) -> None
  Scores a single candidate: Claude call -> persist Evaluation.

process_job_candidates(job_id, candidate_ids, session_factory) -> None
  Batch entry point: runs candidate scoring concurrently using a semaphore.
"""

import asyncio
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.config import settings
from app.schemas import DEFAULT_WEIGHTS

logger = logging.getLogger(__name__)

# Global semaphore: caps concurrent Claude calls across all active batch jobs.
# Initialised here; reset at app startup if MAX_CONCURRENCY changes.
_semaphore: asyncio.Semaphore | None = None


def get_semaphore() -> asyncio.Semaphore:
    global _semaphore
    if _semaphore is None:
        _semaphore = asyncio.Semaphore(settings.max_concurrency)
    return _semaphore


def compute_overall_score(
    category_scores: dict[str, dict],
    weights: dict[str, int] | None,
) -> float:
    """
    Weighted average: Σ(weight_i × score_i) / 100.
    Falls back to DEFAULT_WEIGHTS only when weights is None.
    Result is clamped to [0, 100] and rounded to 1 decimal place.
    """
    w = (
        DEFAULT_WEIGHTS
        if weights is None
        else {category: weights.get(category, 0) for category in DEFAULT_WEIGHTS}
    )
    total_weight = 0
    weighted_sum = 0.0

    for category, weight in w.items():
        data = category_scores.get(category)
        if data is None:
            score = 0
        elif isinstance(data, dict):
            score = data["score"]
        else:
            score = data.score
        weighted_sum += weight * score
        total_weight += weight

    if total_weight == 0:
        return 0.0

    overall = weighted_sum / total_weight
    return round(min(max(overall, 0.0), 100.0), 1)


async def score_candidate(
    candidate_id: int,
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """
    Scores a single candidate:
    1. Load candidate + job + requirements.
    2. Call Claude evaluate_candidate.
    3. Persist Evaluation row, update candidate status.
    """
    from app.models import Candidate, Evaluation
    from app.services.claude import evaluate_candidate

    async with session_factory() as session:
        candidate = await session.get(Candidate, candidate_id)
        if not candidate:
            logger.error("Candidate %s not found", candidate_id)
            return

        # Mark as processing immediately so UI reflects it
        candidate.status = "processing"
        await session.commit()

    async with session_factory() as session:
        from sqlalchemy.orm import selectinload

        result = await session.execute(
            select(Candidate)
            .options(
                selectinload(Candidate.job),
            )
            .where(Candidate.id == candidate_id)
        )
        candidate = result.scalar_one_or_none()
        if not candidate:
            return

        from app.models import Requirement

        req_result = await session.execute(
            select(Requirement).where(Requirement.job_id == candidate.job_id)
        )
        requirements = req_result.scalars().all()

        try:
            eval_result = await evaluate_candidate(
                candidate.job, list(requirements), candidate.raw_text
            )
            category_scores = eval_result.category_scores.model_dump()

            overall = compute_overall_score(
                category_scores,
                candidate.job.category_weights,
            )

            # Delete existing evaluation if this is a rescore
            existing = await session.execute(
                select(Evaluation).where(Evaluation.candidate_id == candidate_id)
            )
            old_eval = existing.scalar_one_or_none()
            if old_eval:
                await session.delete(old_eval)
                await session.flush()

            evaluation = Evaluation(
                candidate_id=candidate_id,
                overall_score=overall,
                category_scores=category_scores,
                requirement_matches=[m.model_dump() for m in eval_result.requirement_matches],
                strengths=eval_result.strengths,
                gaps=eval_result.gaps,
                recommendation=eval_result.recommendation,
                summary=eval_result.summary,
                reasoning=eval_result.reasoning,
                model=settings.claude_model,
            )
            session.add(evaluation)

            # Update candidate name if Claude found it
            if eval_result.candidate_name.strip():
                candidate.name = eval_result.candidate_name.strip()

            candidate.status = "done"
            candidate.error = None
            await session.commit()

        except Exception as e:
            logger.exception("Scoring failed for candidate %s: %s", candidate_id, e)
            candidate.status = "error"
            candidate.error = str(e)[:500]
            await session.commit()


async def process_job_candidates(
    candidate_ids: list[int],
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """
    Runs score_candidate for each candidate concurrently,
    limited by the global semaphore (MAX_CONCURRENCY).
    """
    sem = get_semaphore()

    async def _guarded(cid: int) -> None:
        async with sem:
            await score_candidate(cid, session_factory)

    await asyncio.gather(*[_guarded(cid) for cid in candidate_ids])
