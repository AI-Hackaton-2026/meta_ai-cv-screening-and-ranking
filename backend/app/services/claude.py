"""
Claude AI service.

Two public async functions:
  extract_requirements(job) -> ExtractionResult
  evaluate_candidate(job, requirements, cv_text) -> EvaluationResult

Both use Claude's structured output feature (output_format=PydanticModel)
which guarantees the response matches our Pydantic schemas.

Model is read from settings.claude_model so it can be changed without a code
deploy. All calls are retried once on transient API errors.
"""

import logging
from typing import cast

import anthropic

from app.config import settings
from app.schemas import (
    DEFAULT_WEIGHTS,
    VALID_CATEGORIES,
    EvaluationResult,
    ExtractionResult,
)

logger = logging.getLogger(__name__)

# Module-level async client; shared across all requests.
_client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

# ── Prompt templates ──────────────────────────────────────────────────────────

# Extracts structured requirements + scoring weight suggestions from a job description.
REQUIREMENTS_EXTRACTION_PROMPT = """\
You are an expert technical recruiter. Analyse the job title and description below \
and extract a structured list of candidate requirements.

Job Title: {title}

Job Description:
{description}

Instructions:
1. Extract MUST-HAVE requirements — hard blockers that eliminate unqualified candidates.
2. Extract NICE-TO-HAVE requirements — valuable but not essential.
3. Tag each requirement with one category: skills, experience, education, or domain_fit.
4. Suggest scoring weights (integers summing to 100) for the four categories, \
   reflecting how the job description prioritises them.
5. Be specific and concise — one clear statement per requirement.
"""

# Evaluates a single candidate CV against the job + its extracted requirements.
CANDIDATE_EVALUATION_PROMPT = """\
You are a senior technical recruiter conducting a rigorous, unbiased CV review.

JOB TITLE: {title}
JOB DESCRIPTION:
{description}

REQUIREMENTS (with IDs):
{requirements_block}

CANDIDATE CV:
{cv_text}

Instructions:
1. Extract the candidate's full name from the CV.
2. Score the candidate on each category (0-100). Be critical and calibrated \
   — 90+ is exceptional, 70-89 strong, 50-69 adequate, below 50 weak.
3. Keep category signals separate:
   - skills: exact technical stack, tools, frameworks, APIs, and transferable \
     technical skills.
   - experience: years, seniority, production ownership, architectural scope, \
     backend complexity, team leadership, mentoring, and delivery track record.
     Do not collapse this score just because the candidate used a different \
     language or framework; apply exact-stack penalties primarily in skills and \
     domain_fit. A senior backend engineer in a different stack can score higher \
     in experience than a junior engineer in the exact requested stack.
   - education: degrees, certifications, and relevant formal training.
   - domain_fit: industry/domain context, product type, methodology, and \
     role-context familiarity.
4. When recruiter weights emphasize experience, preserve that intent by making \
   the experience score reflect seniority and transferable backend depth rather \
   than exact keyword overlap.
5. For EACH requirement listed above, determine:
   - met: CV clearly demonstrates this requirement (quote the evidence)
   - partial: CV suggests partial match (quote the best available evidence)
   - unmet: No credible evidence found (quote as empty string or "Not found")
6. List 3-5 key strengths specific to this role.
7. List 3-5 notable gaps or concerns specific to this role.
8. Give a recommendation:
   - advance: Strong fit, recommend moving to next round
   - hold: Borderline, worth reviewing with hiring manager
   - reject: Significant gaps, does not meet minimum bar
9. Write a 2-3 sentence recruiter summary explaining the recommendation.
10. Write a full reasoning paragraph explaining your evaluation process.

Be objective. Do not infer qualifications not stated in the CV.
"""


# ── Helpers ───────────────────────────────────────────────────────────────────


def _build_requirements_block(requirements: list) -> str:
    """Format requirements as a numbered list with IDs for the prompt."""
    lines = []
    for req in requirements:
        kind_label = "MUST-HAVE" if req.kind == "must_have" else "NICE-TO-HAVE"
        lines.append(f"[ID {req.id}] [{kind_label}] [{req.category.upper()}] {req.text}")
    return "\n".join(lines) if lines else "No requirements extracted yet."


def _valid_category_weights(weights: dict[str, int]) -> bool:
    return (
        set(weights) == VALID_CATEGORIES
        and sum(weights.values()) == 100
        and all(weight >= 0 for weight in weights.values())
    )


async def _call_claude[T](prompt: str, output_schema: type[T], attempt: int = 1) -> T:
    """
    Make a single structured-output call to Claude.
    Retries once on APIError (network hiccup, rate limit 429, etc.).
    """
    try:
        # NOTE: `messages.create()` does not accept `output_format` in this SDK version.
        # Use the streaming API, which supports `output_format` and returns parsed output.
        async with _client.messages.stream(
            model=settings.claude_model,
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}],
            output_format=output_schema,  # type: ignore[arg-type]
        ) as stream:
            async for _event in stream:
                pass
            final_message = await stream.get_final_message()
            return cast(T, final_message.parsed_output)
    except anthropic.APIStatusError as e:
        if attempt < 3 and e.status_code in {429, 503, 529}:
            logger.warning("Claude API status %s, retrying attempt %s…", e.status_code, attempt + 1)
            import asyncio

            await asyncio.sleep(30 if e.status_code == 429 else 3)
            return await _call_claude(prompt, output_schema, attempt=attempt + 1)
        raise


# ── Public API ────────────────────────────────────────────────────────────────


async def extract_requirements(job: object) -> ExtractionResult:
    """
    Ask Claude to extract requirements from a job description.
    Returns ExtractionResult with must_have, nice_to_have, and suggested_weights.
    """
    prompt = REQUIREMENTS_EXTRACTION_PROMPT.format(
        title=job.title,  # type: ignore[attr-defined]
        description=job.description,  # type: ignore[attr-defined]
    )
    try:
        result = cast(ExtractionResult, await _call_claude(prompt, ExtractionResult))
    except Exception as e:
        # Let the caller decide how to persist failure state (routers mark status=error).
        logger.exception(
            "Requirement extraction failed for job %s: %s",
            getattr(job, "id", "?"),
            e,
        )
        raise RuntimeError(f"Requirement extraction failed: {e}") from e

    # Ensure all requirements carry the right kind field
    for r in result.must_have:  # type: ignore[union-attr]
        r.kind = "must_have"
    for r in result.nice_to_have:  # type: ignore[union-attr]
        r.kind = "nice_to_have"
    if not result.suggested_weights or not _valid_category_weights(result.suggested_weights):
        result.suggested_weights = DEFAULT_WEIGHTS.copy()
    return result  # type: ignore[return-value]


async def evaluate_candidate(
    job: object,
    requirements: list,
    cv_text: str,
) -> EvaluationResult:
    """
    Ask Claude to evaluate a candidate CV against the job and its requirements.
    Returns EvaluationResult with scores, matches, strengths, gaps, and recommendation.
    Raises on total failure (caller handles status=error).
    """
    if not cv_text.strip():
        raise ValueError("CV text is empty — the file may be a scanned image or corrupt.")

    requirements_block = _build_requirements_block(requirements)
    prompt = CANDIDATE_EVALUATION_PROMPT.format(
        title=job.title,  # type: ignore[attr-defined]
        description=job.description,  # type: ignore[attr-defined]
        requirements_block=requirements_block,
        cv_text=cv_text[:12000],  # guard against huge CVs exceeding context
    )

    result = cast(EvaluationResult, await _call_claude(prompt, EvaluationResult))
    return result
