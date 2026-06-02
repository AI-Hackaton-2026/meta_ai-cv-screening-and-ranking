# MetaHire — Agent Guide

> For AI coding agents (Cursor, Claude, Codex). Read this before touching any code.

## What is MetaHire?

An internal recruiter tool that lets HR teams create job postings and upload candidate CVs (PDF/DOCX). Claude AI extracts job requirements, scores each CV across four categories, and produces a transparent ranked leaderboard with evidence-backed reasoning.

---

## Repository Layout

```
metahire/
├── backend/              # FastAPI app (Python 3.12, uv)
│   ├── app/
│   │   ├── main.py       # app factory + lifespan
│   │   ├── config.py     # env settings (pydantic-settings)
│   │   ├── db.py         # async SQLAlchemy engine + get_session dep
│   │   ├── models.py     # SQLAlchemy ORM models
│   │   ├── schemas.py    # Pydantic request/response + LLM output models
│   │   ├── routers/
│   │   │   ├── jobs.py
│   │   │   └── candidates.py
│   │   └── services/
│   │       ├── parsing.py  # PDF/DOCX -> text
│   │       ├── claude.py   # Claude API calls (structured outputs)
│   │       ├── scoring.py  # weighted scoring + batch orchestrator
│   │       └── export.py   # CSV + PDF export
│   ├── data/             # SQLite DB (gitignored)
│   ├── .env.example      # Template — copy to .env and fill in
│   └── pyproject.toml    # uv project file
│
├── frontend/             # React 19 + Vite 6 (JavaScript)
│   ├── src/
│   │   ├── pages/        # Route-level page components
│   │   ├── components/   # Reusable components
│   │   │   └── ui/       # shadcn/ui generated components
│   │   ├── lib/
│   │   │   ├── api.js    # Axios instance + endpoint helpers
│   │   │   └── queries.js # TanStack Query hooks
│   │   └── styles/
│   │       ├── tokens.css # Symphony brand tokens
│   │       └── main.css  # Global styles + @import tokens
│   └── package.json
│
├── samples/              # Sample job descriptions + CV PDFs
├── docs/                 # User + architecture documentation
├── .cursor/rules/        # Cursor-specific coding conventions
├── AGENTS.md             # This file
├── CLAUDE.md             # Claude-specific notes
└── README.md
```

---

## Key Technical Decisions

| Concern | Choice | Why |
|---|---|---|
| Backend lang | Python 3.12 | Best Claude SDK + PDF parsing ecosystem |
| Package manager | uv | Fast, reproducible lockfile |
| Web framework | FastAPI | Async-native, auto OpenAPI docs |
| Database | SQLite (async) | Zero infra, demo-friendly |
| LLM | Claude (sonnet-4-5) | Structured output via `output_format` |
| Frontend | React 19 + Vite 6 JS | Modern, no TS complexity |
| Styling | Tailwind v4 + shadcn/ui | Brand-token compatible |
| Data fetching | TanStack Query v6 | Polling, caching, mutations |

---

## Essential Commands

### Backend

```bash
cd backend

# Setup (first time)
uv sync
cp .env.example .env
# → fill in ANTHROPIC_API_KEY in .env

# Run
uv run uvicorn app.main:app --reload --port 8000

# Load sample data
uv run python -m app.seed

# Lint + format + types
uv run ruff check .
uv run ruff format .
uv run pyright
```

### Frontend

```bash
cd frontend

# Setup (first time)
npm install

# Run
npm run dev         # → http://localhost:5173

# Build
npm run build

# Lint
npm run lint
```

---

## Environment Variables

All in `backend/.env` (never commit real values):

```
ANTHROPIC_API_KEY=sk-ant-...   # Required — app will not start without this
CLAUDE_MODEL=claude-sonnet-4-5  # Optional — change to experiment
MAX_CONCURRENCY=5               # Concurrent CV scoring tasks
CORS_ORIGINS=http://localhost:5173
DATABASE_URL=sqlite+aiosqlite:///./data/metahire.db
```

---

## Data Model (Quick Reference)

```
Job
 └── Requirement[]   (must_have / nice_to_have, category-tagged)
 └── Candidate[]
      └── Evaluation  (overall_score, category_scores, requirement_matches,
                       strengths, gaps, recommendation, summary)
```

Candidate status lifecycle: `pending → processing → done | error`

---

## API Endpoints (Quick Reference)

```
POST   /jobs                        Create job (triggers requirement extraction)
GET    /jobs                        List all jobs
GET    /jobs/{id}                   Job detail + requirements
PATCH  /jobs/{id}                   Edit weights or requirements
DELETE /jobs/{id}                   Delete job + candidates

POST   /jobs/{id}/candidates        Upload CVs (multipart, 1..N files)
GET    /jobs/{id}/candidates        Leaderboard list (poll this)
GET    /jobs/{id}/status            Batch progress counts

GET    /candidates/{id}             Full evaluation detail
POST   /candidates/{id}/rescore     Re-run Claude scoring
GET    /jobs/{id}/export?format=csv Shortlist CSV
GET    /candidates/{id}/export?format=pdf  Candidate report PDF

POST   /seed                        Load sample jobs + CVs (demo)
```

Interactive docs at `http://localhost:8000/docs` when backend is running.

---

## Scoring System

1. Claude evaluates each CV and returns per-category scores (0-100) with rationale.
2. A weighted average is computed deterministically in `scoring.py`:
   `overall = Σ(weight_i × score_i) / 100`
3. Default weights: Skills 35%, Experience 30%, Education 20%, Domain Fit 15%.
4. Recruiter can edit weights per-job and trigger a batch rescore.

Categories: `skills`, `experience`, `education`, `domain_fit`

---

## Prompting / AI Service

Service: `backend/app/services/claude.py`

- `extract_requirements(job)` → extracts must-have/nice-to-have requirements from job description
- `evaluate_candidate(job, requirements, cv_text)` → full structured evaluation

Both use `client.messages.create(output_format=PydanticModel)` for guaranteed JSON.
Model is configurable via `settings.claude_model`.

---

## Guardrails (Do Not Violate)

1. `ANTHROPIC_API_KEY` must come from env — never hardcode.
2. `backend/.env` is gitignored — never commit it.
3. All DB access is async (`AsyncSession`, `await`).
4. Never bypass `get_session` dependency — no module-level sessions.
5. Candidate `raw_text` is never returned in leaderboard list responses (too large).
6. Feature branches + PRs; never push directly to `main`.
