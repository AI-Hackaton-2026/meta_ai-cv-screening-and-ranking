"""
Pydantic schemas for:
  - API request/response models (what the frontend sends/receives)
  - LLM structured output models (what we ask Claude to return)

Keep these in sync: if you change an LLM output schema you must also
update the corresponding response schema and the prompt in claude.py.
"""

from datetime import datetime

from pydantic import BaseModel, Field

# ── Weights ───────────────────────────────────────────────────────────────────

DEFAULT_WEIGHTS: dict[str, int] = {
    "skills": 35,
    "experience": 30,
    "education": 20,
    "domain_fit": 15,
}

VALID_CATEGORIES = {"skills", "experience", "education", "domain_fit"}


# ── Job ───────────────────────────────────────────────────────────────────────


class JobCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=10)


class JobUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    category_weights: dict[str, int] | None = None


class RequirementOut(BaseModel):
    id: int
    text: str
    kind: str  # must_have | nice_to_have
    category: str

    model_config = {"from_attributes": True}


class JobOut(BaseModel):
    id: int
    title: str
    description: str
    extraction_status: str
    extraction_error: str | None
    category_weights: dict[str, int] | None
    created_at: datetime
    requirements: list[RequirementOut] = []

    model_config = {"from_attributes": True}


class JobListItem(BaseModel):
    id: int
    title: str
    extraction_status: str
    created_at: datetime
    candidate_count: int = 0

    model_config = {"from_attributes": True}


# ── Candidate / Leaderboard ───────────────────────────────────────────────────


class CategoryScoreOut(BaseModel):
    score: float
    rationale: str


class RequirementMatchOut(BaseModel):
    requirement_id: int
    status: str  # met | partial | unmet
    evidence: str


class EvaluationOut(BaseModel):
    id: int
    overall_score: float
    category_scores: dict[str, CategoryScoreOut]
    requirement_matches: list[RequirementMatchOut]
    strengths: list[str]
    gaps: list[str]
    recommendation: str  # advance | hold | reject
    summary: str
    reasoning: str
    model: str
    created_at: datetime

    model_config = {"from_attributes": True}


class CandidateOut(BaseModel):
    id: int
    job_id: int
    name: str
    original_filename: str
    has_cv_preview: bool = False
    status: str
    error: str | None
    uploaded_at: datetime
    evaluation: EvaluationOut | None = None

    model_config = {"from_attributes": True}


class LeaderboardEntry(BaseModel):
    """Leaderboard row — no raw_text, minimal data for the list view."""

    rank: int
    id: int
    name: str
    original_filename: str
    status: str
    overall_score: float | None
    category_scores: dict[str, CategoryScoreOut] | None
    recommendation: str | None
    summary: str | None
    error: str | None = None

    model_config = {"from_attributes": True}


class LeaderboardPage(BaseModel):
    items: list[LeaderboardEntry]
    total: int
    offset: int
    limit: int
    search: str | None = None


class BatchStatusOut(BaseModel):
    total: int
    pending: int
    processing: int
    done: int
    error: int


# ── LLM structured output models (passed to output_format=) ──────────────────


class RequirementItem(BaseModel):
    """A single extracted job requirement."""

    text: str = Field(..., description="Concise requirement statement")
    kind: str = Field(..., description="must_have or nice_to_have")
    category: str = Field(..., description="skills, experience, education, or domain_fit")


class ExtractionResult(BaseModel):
    """Claude returns this when extracting requirements from a job description."""

    must_have: list[RequirementItem] = Field(
        default_factory=list,
        description="Requirements that are strictly necessary for the role",
    )
    nice_to_have: list[RequirementItem] = Field(
        default_factory=list,
        description="Requirements that are preferred but not essential",
    )
    suggested_weights: dict[str, int] = Field(
        default_factory=lambda: DEFAULT_WEIGHTS.copy(),
        description="Suggested scoring weights per category, must sum to 100",
    )


class CategoryScore(BaseModel):
    """Per-category score with rationale."""

    score: float = Field(..., ge=0, le=100, description="Score 0-100")
    rationale: str = Field(..., description="One-paragraph explanation of the score")


class CategoryScoreSet(BaseModel):
    """Required scores for all four scoring categories."""

    skills: CategoryScore = Field(..., description="Technical skills score and rationale")
    experience: CategoryScore = Field(
        ..., description="Professional experience score and rationale"
    )
    education: CategoryScore = Field(
        ..., description="Education and credentials score and rationale"
    )
    domain_fit: CategoryScore = Field(
        ..., description="Domain and role-context fit score and rationale"
    )


class RequirementMatch(BaseModel):
    """How well the candidate meets a specific requirement."""

    requirement_id: int = Field(..., description="ID of the Requirement row")
    status: str = Field(..., description="met, partial, or unmet")
    evidence: str = Field(
        ...,
        description="Verbatim quote or direct reference from the CV supporting this status",
    )


class EvaluationResult(BaseModel):
    """Claude returns this when evaluating a candidate against a job."""

    # Claude also extracts the candidate's name if not already known
    candidate_name: str = Field(..., description="Candidate's full name as found in the CV")
    category_scores: CategoryScoreSet = Field(
        ...,
        description="Scores for all categories: skills, experience, education, domain_fit",
    )
    requirement_matches: list[RequirementMatch]
    strengths: list[str] = Field(..., description="3-5 key strengths relative to this specific job")
    gaps: list[str] = Field(..., description="3-5 notable gaps or missing qualifications")
    recommendation: str = Field(..., description="advance, hold, or reject based on overall fit")
    summary: str = Field(
        ...,
        description=(
            "2-3 sentence recruiter-ready summary: who the candidate is, "
            "why they fit (or don't), and the recommendation rationale"
        ),
    )
    reasoning: str = Field(
        ...,
        description="Full chain-of-thought reasoning behind the evaluation",
    )
