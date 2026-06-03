"""
MetaHire API — application entry point.
"""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.engine import make_url

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
    # Ensure the data directory exists for local SQLite databases.
    database_url = make_url(settings.database_url)
    if database_url.drivername.startswith("sqlite") and database_url.database:
        os.makedirs(os.path.dirname(database_url.database) or ".", exist_ok=True)

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


@app.api_route("/health", methods=["GET", "HEAD"], tags=["meta"])
async def health() -> dict:
    return {"status": "ok", "model": settings.claude_model}
