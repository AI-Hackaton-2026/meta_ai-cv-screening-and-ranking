# MetaHire — AI CV Screening & Ranking Tool

> **FEP 2026 Hackathon** — Symphony AI-native engineering team

MetaHire helps recruiters prioritize candidates faster. Create a job from a description, upload CVs (PDF/DOCX), and Claude extracts requirements, scores each candidate across four categories, and ranks them with evidence-backed reasoning. Humans stay in control: all scores and recommendations are advisory.

---

## Features

- **Job + requirement extraction** — must-have / nice-to-have requirements from the job description
- **Batch CV screening** — concurrent background scoring with live leaderboard updates
- **Transparent scoring** — Skills, Experience, Education, Domain Fit (0–100) with rationales; tunable category weights
- **Evidence** — per-requirement met/partial/unmet with quotes from the CV
- **Candidate detail** — summary, strengths/gaps, full reasoning, PDF export
- **Compare** — up to 4 candidates side-by-side
- **Exports** — shortlist CSV per job, evaluation PDF per candidate

---

## Quick Start

### Prerequisites

| Tool                             | Version                                                |
| -------------------------------- | ------------------------------------------------------ |
| Python                           | 3.12                                                   |
| [uv](https://docs.astral.sh/uv/) | latest                                                 |
| Node.js                          | 22+                                                    |
| Anthropic API key                | [console.anthropic.com](https://console.anthropic.com) |

### Backend

```bash
cd backend
uv sync
cp .env.example .env   # set ANTHROPIC_API_KEY and DATABASE_URL (Supabase)
uv run uvicorn app.main:app --reload --port 8000
```

API: **http://localhost:8000** · OpenAPI: **http://localhost:8000/docs**

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App: **http://localhost:5173** (Vite proxies `/api` → backend)

---

## Environment variables

Copy `backend/.env.example` → `backend/.env`.

| Variable            | Required | Description                                    |
| ------------------- | -------- | ---------------------------------------------- |
| `ANTHROPIC_API_KEY` | Yes      | Claude API key                                 |
| `CLAUDE_MODEL`      | No       | Default `claude-sonnet-4-5`                    |
| `MAX_CONCURRENCY`   | No       | Parallel scoring tasks (default `5`)           |
| `CORS_ORIGINS`      | No       | Frontend origin(s), comma-separated            |
| `DATABASE_URL`      | Yes      | Supabase Postgres session pooler URL (see `docs/setup.md`) |
| `SUPABASE_*`        | No       | Optional private storage for original CV files |

See [docs/setup.md](docs/setup.md) for Supabase setup and troubleshooting.

---

## How AI works (presentation reference)

1. **Requirement extraction** (on job create) — Claude returns structured must-have / nice-to-have requirements and suggested category weights.
2. **Candidate evaluation** (per CV) — category scores, requirement matches with verbatim evidence, strengths/gaps, recommendation (`advance` / `hold` / `reject`), summary, and reasoning.
3. **Overall score** — computed in Python: `Σ(weight × category_score) / total_weight` (not by the model). Recruiters can change weights and rescore.
4. **Human oversight** — recommendations are advisory; recruiters review evidence and decide.

More detail: [docs/ai.md](docs/ai.md) · Architecture: [docs/architecture.md](docs/architecture.md) · API: [docs/api.md](docs/api.md)

---

## Development

```bash
# Backend
cd backend && uv run ruff check . && uv run pyright

# Frontend
cd frontend && npm run lint && npm run build
```

---

## Tech stack

| Layer    | Technology                                       |
| -------- | ------------------------------------------------ |
| AI       | Anthropic Claude (structured outputs)            |
| Backend  | FastAPI · Python 3.12 · uv · PostgreSQL (Supabase) |
| Frontend | React 19 · Vite 6 · TanStack Query · Tailwind v4 |
| CI       | GitHub Actions (ruff, pyright, eslint, build)    |
