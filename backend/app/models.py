"""
SQLAlchemy ORM models. Business logic lives in services/, not here.
JSON columns use PostgreSQL JSONB (dict/list in Python).
"""

from datetime import UTC, datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def _utcnow() -> datetime:
    return datetime.now(UTC)


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    extraction_status: Mapped[str] = mapped_column(String(20), default="pending")
    extraction_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    category_weights: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

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
    kind: Mapped[str] = mapped_column(String(20), nullable=False)
    category: Mapped[str] = mapped_column(String(30), nullable=False)

    job: Mapped["Job"] = relationship("Job", back_populates="requirements")


class Candidate(Base):
    __tablename__ = "candidates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id"), nullable=False, index=True)

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    original_filename: Mapped[str] = mapped_column(String(500), nullable=False)
    storage_path: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    raw_text: Mapped[str] = mapped_column(Text, nullable=False)
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
    category_scores: Mapped[dict] = mapped_column(JSONB, nullable=False)
    requirement_matches: Mapped[list] = mapped_column(JSONB, nullable=False)

    strengths: Mapped[list] = mapped_column(JSONB, nullable=False)
    gaps: Mapped[list] = mapped_column(JSONB, nullable=False)

    recommendation: Mapped[str] = mapped_column(String(20), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    reasoning: Mapped[str] = mapped_column(Text, nullable=False)
    model: Mapped[str] = mapped_column(String(100), nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    candidate: Mapped["Candidate"] = relationship("Candidate", back_populates="evaluation")
