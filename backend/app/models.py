"""
SQLAlchemy ORM models. Business logic lives in services/, not here.
JSON columns store Python dicts/lists serialised as TEXT.
"""

import json
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import TypeDecorator

from app.db import Base

# ── Custom JSON column type ───────────────────────────────────────────────────


class JSONType(TypeDecorator):
    """Stores Python objects as JSON text in SQLite."""

    impl = Text
    cache_ok = True

    def process_bind_param(self, value: Any, dialect: Any) -> str | None:
        return json.dumps(value) if value is not None else None

    def process_result_value(self, value: Any, dialect: Any) -> Any:
        return json.loads(value) if value is not None else None


def _utcnow() -> datetime:
    return datetime.now(UTC)


# ── Models ────────────────────────────────────────────────────────────────────


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    # "pending" | "extracting" | "done" | "error"
    extraction_status: Mapped[str] = mapped_column(String(20), default="pending")
    extraction_error: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Weights per scoring category (dict: category -> int, must sum to 100).
    # Defaults set by Claude on extraction; recruiter can edit.
    category_weights: Mapped[dict | None] = mapped_column(JSONType, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )

    requirements: Mapped[list["Requirement"]] = relationship(
        "Requirement", back_populates="job", cascade="all, delete-orphan"
    )
    candidates: Mapped[list["Candidate"]] = relationship(
        "Candidate", back_populates="job", cascade="all, delete-orphan"
    )


class Requirement(Base):
    __tablename__ = "requirements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id"), nullable=False, index=True)

    text: Mapped[str] = mapped_column(Text, nullable=False)
    # "must_have" | "nice_to_have"
    kind: Mapped[str] = mapped_column(String(20), nullable=False)
    # "skills" | "experience" | "education" | "domain_fit"
    category: Mapped[str] = mapped_column(String(30), nullable=False)

    job: Mapped["Job"] = relationship("Job", back_populates="requirements")


class Candidate(Base):
    __tablename__ = "candidates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id"), nullable=False, index=True)

    # Extracted from CV by Claude (first pass); falls back to filename stem
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(500), nullable=False)

    # Full CV text extracted from the uploaded file (not returned in list responses)
    raw_text: Mapped[str] = mapped_column(Text, nullable=False)

    # "pending" | "processing" | "done" | "error"
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)

    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    job: Mapped["Job"] = relationship("Job", back_populates="candidates")
    evaluation: Mapped["Evaluation | None"] = relationship(
        "Evaluation", back_populates="candidate", uselist=False, cascade="all, delete-orphan"
    )


class Evaluation(Base):
    __tablename__ = "evaluations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id"), nullable=False, unique=True, index=True
    )

    overall_score: Mapped[float] = mapped_column(Float, nullable=False)

    # {"skills": {"score": 85, "rationale": "..."}, ...}
    category_scores: Mapped[dict] = mapped_column(JSONType, nullable=False)

    # [{"requirement_id": 1, "status": "met", "evidence": "..."}, ...]
    requirement_matches: Mapped[list] = mapped_column(JSONType, nullable=False)

    strengths: Mapped[list] = mapped_column(JSONType, nullable=False)
    gaps: Mapped[list] = mapped_column(JSONType, nullable=False)

    # "advance" | "hold" | "reject"
    recommendation: Mapped[str] = mapped_column(String(20), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)

    # Full chain-of-thought reasoning from Claude
    reasoning: Mapped[str] = mapped_column(Text, nullable=False)

    # Which Claude model produced this evaluation
    model: Mapped[str] = mapped_column(String(100), nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    candidate: Mapped["Candidate"] = relationship("Candidate", back_populates="evaluation")
