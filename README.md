# MetaHire — AI CV Screening & Ranking Tool

> **FEP 2026 Hackathon** — Symphony AI-native engineering team

MetaHire is an internal recruiter tool. Create job postings, upload candidate CVs (PDF/DOCX, single or batch), and let Claude AI extract requirements, score candidates across four dimensions, and produce a transparent ranked leaderboard with evidence-backed reasoning.

---

## Features

- **Job management** — create and manage job openings with descriptions
- **Automated requirement extraction** — Claude reads the job description and extracts must-have and nice-to-have requirements, automatically
- **Batch CV screening** — upload 1-N PDF or DOCX files; all are processed concurrently in the background
- **Transparent scoring** — four scoring categories (Skills, Experience, Education, Domain Fit) with per-category rationales and recruiter-tunable weights
- **Evidence quotes** — every requirement match shows a verbatim quote from the CV
- **Ranked leaderboard** — live-updated ranking as candidates are processed
- **Candidate drilldown** — radar chart, requirement checklist, strengths & gaps, full AI reasoning
- **Side-by-side comparison** — compare up to 4 candidates simultaneously
- **Export** — shortlist CSV per job, individual PDF evaluation report per candidate
- **Demo data** — one-click sample data loader with 8 varied CV profiles

---

## Quick Start

### Prerequisites

| Tool | Version | Install |
|---|---|---|
| Python | 3.12 | [python.org](https://python.org) |
| uv | latest | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| Node.js | 22+ | [nodejs.org](https://nodejs.org) |
| npm | 10+ | bundled with Node |

### 1. Backend

```bash
cd backend

# Install dependencies
uv sync

# Configure environment (required: ANTHROPIC_API_KEY)
cp .env.example .env
# → Open .env and set ANTHROPIC_API_KEY=sk-ant-...

# Start API server
uv run uvicorn app.main:app --reload --port 8000
```

API is now at **http://localhost:8000** — interactive docs at **http://localhost:8000/docs**

### 2. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

App is now at **http://localhost:5173**

### 3. Load sample data (optional)

Either click **"Load Sample Data"** in the UI, or:

```bash
# Generate sample CV PDFs (one-time, only needed if samples/cvs/ is empty)
cd backend && uv run python ../samples/create_sample_cvs.py

# Seed via API
curl -X POST http://localhost:8000/seed
```

---

## Project Structure

```
metahire/
├── backend/              # FastAPI API (Python 3.12, uv)
│   ├── app/
│   │   ├── main.py       # App factory, lifespan, CORS
│   │   ├── config.py     # Environment settings
│   │   ├── db.py         # Async SQLAlchemy engine + session
│   │   ├── models.py     # ORM models (Job, Requirement, Candidate, Evaluation)
│   │   ├── schemas.py    # Pydantic schemas + LLM output models
│   │   ├── routers/      # HTTP route handlers
│   │   │   ├── jobs.py
│   │   │   └── candidates.py
│   │   ├── services/     # Business logic
│   │   │   ├── parsing.py   # PDF/DOCX → text
│   │   │   ├── claude.py    # Claude API integration
│   │   │   ├── scoring.py   # Weighted scoring + batch orchestrator
│   │   │   └── export.py    # CSV + PDF export
│   │   └── seed.py       # Demo data loader
│   ├── data/             # SQLite database (gitignored)
│   ├── .env.example      # Environment variable template
│   └── pyproject.toml    # uv project + tool config
│
├── frontend/             # React 19 + Vite 6 (JavaScript)
│   ├── src/
│   │   ├── App.jsx       # Router root
│   │   ├── main.jsx      # Entry point
│   │   ├── pages/        # Route components
│   │   ├── components/   # Reusable UI components
│   │   │   └── ui/       # Design system primitives
│   │   ├── lib/
│   │   │   ├── api.js    # Axios API client
│   │   │   ├── queries.js # TanStack Query hooks
│   │   │   └── utils.js  # Formatting helpers
│   │   └── styles/
│   │       ├── tokens.css # Symphony brand design tokens
│   │       └── main.css  # Global styles + Tailwind import
│   └── package.json
│
├── samples/              # Demo data
│   ├── cvs/              # Sample CV PDFs (generated)
│   ├── jobs/             # Sample job descriptions
│   └── create_sample_cvs.py  # PDF generator script
│
├── docs/                 # Extended documentation
├── .cursor/rules/        # Cursor AI coding conventions
├── AGENTS.md             # AI agent guide (Cursor, Codex, Claude)
├── CLAUDE.md             # Claude-specific notes
└── README.md             # This file
```

---

## Environment Variables

All in `backend/.env` (copy from `backend/.env.example`):

| Variable | Required | Default | Description |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ | — | Your Anthropic API key |
| `CLAUDE_MODEL` | | `claude-sonnet-4-5` | Claude model to use |
| `MAX_CONCURRENCY` | | `5` | Max concurrent scoring tasks |
| `CORS_ORIGINS` | | `http://localhost:5173` | Allowed frontend origins |
| `DATABASE_URL` | | `sqlite+aiosqlite:///./data/metahire.db` | Database path |

---

## Documentation

| Doc | Description |
|---|---|
| [docs/setup.md](docs/setup.md) | Detailed setup + troubleshooting |
| [docs/usage.md](docs/usage.md) | Recruiter user guide |
| [docs/architecture.md](docs/architecture.md) | System architecture + data model |
| [docs/api.md](docs/api.md) | API endpoint reference |
| [docs/ai.md](docs/ai.md) | AI integration details, prompts, scoring math |
| [docs/branding.md](docs/branding.md) | Symphony design token reference |
| [AGENTS.md](AGENTS.md) | AI agent guide for Cursor/Codex/Claude |

---

## Development

### Backend checks

```bash
cd backend
uv run ruff check .        # lint
uv run ruff format .       # format
uv run pyright             # type check
```

### Frontend checks

```bash
cd frontend
npm run lint               # eslint
npm run build              # production build check
```

---

## How AI Works (Jury Reference)

1. **Requirement Extraction**: When a job is created, Claude reads the job description and extracts structured must-have and nice-to-have requirements, tagging each to a scoring category (Skills, Experience, Education, Domain Fit). It also suggests scoring weights based on the role's emphasis.

2. **Candidate Evaluation**: Claude reads each CV against the job requirements and returns:
   - Per-category scores (0–100) with rationale
   - Per-requirement status (met/partial/unmet) with verbatim evidence quotes
   - Strengths and gaps specific to this role
   - A recommendation (advance/hold/reject) with recruiter summary
   - Full chain-of-thought reasoning

3. **Transparent Scoring**: Overall score = `Σ(weight × score) / 100` — a deterministic formula visible to recruiters who can edit weights and rescore.

4. **Human Oversight**: Recommendations are advisory. Recruiters see all reasoning, can compare candidates, and make final decisions.

---

## Tech Stack

| Layer | Technology |
|---|---|
| AI | Anthropic Claude (claude-sonnet-4-5, structured outputs) |
| Backend | FastAPI 0.136 · Python 3.12 · uv |
| Database | SQLite (async SQLAlchemy 2.0 + aiosqlite) |
| PDF parsing | pypdf / pdfplumber + python-docx |
| PDF export | reportlab |
| Frontend | React 19 · Vite 6 · JavaScript |
| Styling | Tailwind CSS v4 · Symphony brand tokens |
| Data fetching | TanStack Query v5 |
| Charts | recharts |
| CI | GitHub Actions (ruff + eslint) |
