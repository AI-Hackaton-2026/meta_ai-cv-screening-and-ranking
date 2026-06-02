"""
Seed script: loads sample jobs and creates synthetic candidate records for demo.
Run directly: uv run python -m app.seed
"""

import asyncio
import logging
from pathlib import Path

from sqlalchemy import select

from app.db import AsyncSessionLocal, create_tables
from app.models import Candidate, Job
from app.services.parsing import extract_text

logger = logging.getLogger(__name__)

SAMPLES_DIR = Path(__file__).parent.parent.parent / "samples"


SAMPLE_JOBS = [
    {
        "title": "Senior Full-Stack Engineer",
        "description": """
We are looking for a Senior Full-Stack Engineer to join our product team.

Requirements:
- 5+ years of professional software development experience
- Strong proficiency in React (or similar modern frontend framework) and Node.js or Python
- Experience with cloud platforms (AWS, GCP, or Azure)
- Solid understanding of RESTful API design and microservices architecture
- Experience with SQL and NoSQL databases
- Familiarity with CI/CD pipelines and DevOps practices
- Strong communication and team collaboration skills

Nice to have:
- Experience with TypeScript
- Knowledge of containerisation (Docker, Kubernetes)
- Contributions to open-source projects
- Experience in a fast-paced startup or scale-up environment

We offer a collaborative environment, competitive compensation, and the chance to work
on impactful products used by thousands of users.
""".strip(),
    },
    {
        "title": "AI/ML Engineer",
        "description": """
Join our AI team to build the next generation of intelligent systems.

What we're looking for:
- 3+ years experience in machine learning engineering or applied research
- Proficiency in Python and ML frameworks (PyTorch or TensorFlow)
- Experience building and deploying ML models to production
- Understanding of LLM APIs (OpenAI, Anthropic, etc.) and prompt engineering
- Knowledge of vector databases, embeddings, and RAG architectures
- Experience with MLOps tooling (MLflow, W&B, or similar)

Bonus:
- PhD or MSc in Computer Science, ML, or related field
- Published research or open-source ML contributions
- Experience with fine-tuning large language models
- Knowledge of data pipelines (Spark, Airflow, dbt)

You will work on AI-powered features used by enterprise clients, collaborating closely
with product and engineering teams.
""".strip(),
    },
]


async def seed() -> None:
    """
    Creates sample jobs and sample candidates from the samples/ directory.
    Skips if jobs with the same titles already exist.
    """
    await create_tables()

    async with AsyncSessionLocal() as session:
        for job_data in SAMPLE_JOBS:
            # Check if this job already exists
            result = await session.execute(select(Job).where(Job.title == job_data["title"]))
            existing = result.scalar_one_or_none()
            if existing:
                logger.info("Job already exists, skipping: %s", job_data["title"])
                continue

            job = Job(**job_data)
            session.add(job)
            await session.flush()
            job_id = job.id
            candidate_ids: list[int] = []

            # Load sample CVs from samples/cvs/
            cv_dir = SAMPLES_DIR / "cvs"
            if cv_dir.exists():
                for cv_file in sorted(cv_dir.glob("*.pdf")) + sorted(cv_dir.glob("*.docx")):
                    try:
                        content = cv_file.read_bytes()
                        text = extract_text(cv_file.name, content)
                        name = cv_file.stem.replace("_", " ").replace("-", " ").title()
                        candidate = Candidate(
                            job_id=job_id,
                            name=name,
                            original_filename=cv_file.name,
                            raw_text=text,
                            status="pending",
                        )
                        session.add(candidate)
                        await session.flush()
                        candidate_ids.append(candidate.id)
                        logger.info("Added candidate %s to job %s", cv_file.name, job_id)
                    except Exception as e:
                        logger.warning("Could not load %s: %s", cv_file.name, e)

            await session.commit()
            logger.info("Created job: %s (id=%s)", job_data["title"], job_id)

            # Run extraction before scoring so candidate evaluations can reference requirements.
            from app.routers.jobs import _trigger_extraction
            from app.services.scoring import process_job_candidates

            await _trigger_extraction(job_id)
            if candidate_ids:
                await process_job_candidates(candidate_ids, AsyncSessionLocal)

    logger.info("Seed complete.")


async def main() -> None:
    logging.basicConfig(level=logging.INFO)
    await seed()


if __name__ == "__main__":
    asyncio.run(main())
