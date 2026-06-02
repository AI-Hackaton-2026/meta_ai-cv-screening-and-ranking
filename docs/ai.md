# AI Integration Details

## Overview

MetaHire uses Claude (Anthropic) as its AI backend for two tasks:
1. **Requirement extraction** — parsing a job description into structured requirements
2. **Candidate evaluation** — scoring a CV against a job and its requirements

Both use [Claude's structured output feature](https://docs.anthropic.com/en/docs/build-with-claude/structured-outputs) (`output_format=PydanticModel`) which guarantees the response matches the Pydantic schema — no JSON parsing errors, no hallucinated fields.

---

## Requirement Extraction

**Trigger:** When a job is created via `POST /jobs`

**Input:** Job title + description

**Output schema:** `ExtractionResult`
```python
class ExtractionResult(BaseModel):
    must_have: list[RequirementItem]      # Hard blockers
    nice_to_have: list[RequirementItem]   # Preferred but not essential
    suggested_weights: dict[str, int]     # Category weights summing to 100
```

Each `RequirementItem` has:
- `text` — concise requirement statement
- `kind` — `must_have` or `nice_to_have`
- `category` — `skills`, `experience`, `education`, or `domain_fit`

**Prompt strategy:** Claude is instructed to be specific and concise (one statement per requirement), and to suggest weights that reflect the role's priorities from the job description.

---

## Candidate Evaluation

**Trigger:** When a CV is uploaded and queued for scoring

**Input:** Job title + description + requirement list (with IDs) + CV text

**Output schema:** `EvaluationResult`
```python
class EvaluationResult(BaseModel):
    candidate_name: str
    category_scores: dict[str, CategoryScore]      # 0-100 + rationale per category
    requirement_matches: list[RequirementMatch]    # met/partial/unmet + evidence quote
    strengths: list[str]                           # 3-5 role-specific strengths
    gaps: list[str]                                # 3-5 role-specific gaps
    recommendation: str                            # advance | hold | reject
    summary: str                                   # 2-3 sentence recruiter summary
    reasoning: str                                 # Full chain-of-thought
```

**Prompt strategy:**
- Claude is instructed to be calibrated: 90+ = exceptional, 70-89 = strong, 50-69 = adequate, <50 = weak
- Per-requirement evidence quotes must be verbatim from the CV, or "Not found"
- Recommendation criteria: advance = strong fit, hold = borderline, reject = significant gaps
- Claude is told not to infer qualifications not stated in the CV

---

## Scoring Formula

Overall score is computed deterministically in Python (not by Claude):

```python
overall = sum(weight[category] * score[category] for category in categories) / total_weight
```

Default weights: `skills=35, experience=30, education=20, domain_fit=15`

This makes the score transparent and recruiter-tunable — changing weights and rescoring produces a predictable, explainable new score.

---

## Concurrency + Reliability

- Background tasks run under a shared `asyncio.Semaphore(MAX_CONCURRENCY)` to avoid API rate limits
- One transient retry on HTTP 429 / 503 / 529 responses (3-second backoff)
- CV text is truncated to 12,000 characters before sending to Claude (guards context limit)
- On Claude API failure: candidate status is set to `error` with the error message stored — never silently lost

---

## Jury Criteria Mapping

| Jury Criterion | How MetaHire addresses it |
|---|---|
| AI Strategy & Value | Requirement extraction removes manual JD analysis; per-requirement evidence shows exactly where AI adds value |
| Technical AI Execution | Structured outputs (Pydantic), concurrent batch, configurable model, retry logic |
| Transparency | Verbatim CV evidence quotes; deterministic weighted scoring formula visible to users; full reasoning expandable in UI |
| Business Value | Reduces CV review time; consistent evaluation criteria; exportable shortlists; human-in-the-loop design |
| UX/Demo Quality | Live leaderboard; radar chart; requirement checklist; side-by-side comparison; PDF report |

---

## Limitations (Important for Demo)

- **No OCR**: Scanned PDF images will not extract text. Use digital (text-based) PDFs.
- **CV length**: Text is truncated at 12,000 characters. Extremely long CVs may lose trailing content.
- **Single model**: The same Claude model scores all candidates. Different models may produce different calibrations.
- **AI is advisory**: Scores and recommendations are starting points for human review, not final decisions.
