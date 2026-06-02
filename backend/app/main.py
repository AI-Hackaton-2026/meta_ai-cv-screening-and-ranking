"""
MetaHire API — application entry point.
"""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import create_tables
from app.routers import candidates, jobs

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure the data directory exists (aiosqlite requires the parent dir)
    db_path = settings.database_url.replace("sqlite+aiosqlite:///", "")
    os.makedirs(os.path.dirname(db_path) or ".", exist_ok=True)

    await create_tables()
    logger.info("MetaHire API started. Model: %s", settings.claude_model)
    yield
    logger.info("MetaHire API shutting down.")


app = FastAPI(
    title="MetaHire API",
    description="AI-powered CV Screening & Ranking — Symphony FEP 2026 Hackathon",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(jobs.router)
app.include_router(candidates.router)


@app.get("/health", tags=["meta"])
async def health() -> dict:
    return {"status": "ok", "model": settings.claude_model}
