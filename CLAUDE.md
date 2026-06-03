# MetaHire — Claude Agent Notes

> See [AGENTS.md](AGENTS.md) for the full project guide. This file adds Claude-specific context.

## Project Summary

MetaHire is an internal AI-powered CV screening and ranking tool built for the FEP 2026 Hackathon. Recruiters create job postings, upload CVs, and get Claude-generated structured evaluations with transparent scoring.

## Claude's Role in This App

This app *uses* Claude as its AI backend. The integration lives in:
- `backend/app/services/claude.py` — two async functions using the Anthropic Python SDK
- `backend/app/schemas.py` — Pydantic models that define the expected JSON output

When you (Claude, as a coding agent) modify these files, be careful not to break the structured output schemas — the Pydantic models are passed directly to `client.messages.create(output_format=...)` and any mismatch will cause runtime errors.

## When Asked to Modify Prompts

Prompts live at the top of `claude.py` as module-level string constants (`REQUIREMENTS_EXTRACTION_PROMPT`, `CANDIDATE_EVALUATION_PROMPT`). When refining:
- Keep the JSON output contract identical unless also updating `schemas.py`
- Preserve the instruction to return verbatim evidence quotes from the CV
- Maintain the 0-100 score range for all category scores

## Stack Cheatsheet

```
Backend:  FastAPI 0.136 / Python 3.12 / uv / Pydantic v2 / async SQLAlchemy + asyncpg
AI:       Anthropic SDK ~0.104, model: claude-sonnet-4-5 (configurable)
Frontend: React 19 / Vite 6 / JavaScript JSX / Tailwind v4 / shadcn new-york-v4
DB:       PostgreSQL (Supabase session pooler)
```

## Quick Start

```bash
# Backend
cd backend && uv sync && cp .env.example .env
# edit .env → set ANTHROPIC_API_KEY and DATABASE_URL (Supabase session pooler)
uv run uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend && npm install && npm run dev
```

## Important Constraints

- **No TypeScript** — frontend is plain JavaScript JSX
- **No Docker** — two-terminal local run only
- **No Alembic** — schema managed via `create_all` in lifespan
- **No auth** — single shared workspace, no user accounts
- **Async everywhere** in the backend — never use sync SQLAlchemy calls
