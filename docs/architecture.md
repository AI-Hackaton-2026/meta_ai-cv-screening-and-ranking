# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│  Browser (React 19 + Vite 6)                            │
│  ├── Jobs Dashboard (/): list, create, seed             │
│  ├── Job Detail (/jobs/:id): requirements, upload,      │
│  │   leaderboard, weights                               │
│  ├── Candidate Drilldown (dialog): radar, checklist,    │
│  │   strengths/gaps, reasoning                          │
│  └── Compare View (dialog): side-by-side               │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTP (proxied /api → :8000 in dev)
┌─────────────────────▼───────────────────────────────────┐
│  FastAPI (Python 3.12, async, port 8000)                │
│  ├── routers/jobs.py: CRUD, upload, leaderboard, export │
│  ├── routers/candidates.py: detail, rescore, PDF export │
│  ├── services/parsing.py: PDF/DOCX → text               │
│  ├── services/claude.py: requirement extraction +       │
│  │   candidate evaluation (structured output)           │
│  ├── services/scoring.py: weighted average +            │
│  │   asyncio.Semaphore batch orchestrator               │
│  └── services/export.py: CSV + PDF generation           │
└────────────┬──────────────────┬─────────────────────────┘
             │                  │
    ┌────────▼──────┐  ┌────────▼──────────────────────────┐
    │  SQLite DB    │  │  Anthropic API (Claude)            │
    │  (aiosqlite)  │  │  claude-sonnet-4-5 (default)       │
    └───────────────┘  └───────────────────────────────────┘
```

## Request Flow: CV Upload + Scoring

```
1. POST /jobs/{id}/candidates (multipart files)
   │
   ├── Parse each file to text (pypdf / pdfplumber / python-docx)
   ├── Create Candidate rows (status=pending) in DB
   └── asyncio.create_task(process_job_candidates([ids]))
       │
       └── [background, semaphore-limited]
           ├── Set candidate.status = "processing"
           ├── Load job + requirements from DB
           ├── Call claude.evaluate_candidate()
           │   └── Anthropic API: output_format=EvaluationResult
           ├── Compute overall_score = Σ(weight × score) / 100
           ├── Save Evaluation row to DB
           └── Set candidate.status = "done"

2. Frontend polls GET /jobs/{id}/candidates every 2s
   └── Returns leaderboard sorted by overall_score (done first)
```

## Data Model

```
Job
├── id, title, description
├── extraction_status: pending | extracting | done | error
├── category_weights: {skills, experience, education, domain_fit} (JSON)
├── created_at, updated_at
│
├── Requirement[]
│   ├── id, job_id FK
│   ├── text, kind: must_have | nice_to_have
│   └── category: skills | experience | education | domain_fit
│
└── Candidate[]
    ├── id, job_id FK
    ├── name (Claude-extracted), original_filename
    ├── raw_text (full CV text, never returned in list responses)
    ├── status: pending | processing | done | error
    ├── error (error message if status=error)
    └── uploaded_at
        │
        └── Evaluation (1:1 with Candidate, replaced on rescore)
            ├── id, candidate_id FK
            ├── overall_score: float (weighted average)
            ├── category_scores: {category: {score, rationale}} (JSON)
            ├── requirement_matches: [{requirement_id, status, evidence}] (JSON)
            ├── strengths, gaps: string[] (JSON)
            ├── recommendation: advance | hold | reject
            ├── summary, reasoning: text
            └── model: string (which Claude model was used)
```

## Concurrency Model

- In-process async, single uvicorn worker
- Module-level `asyncio.Semaphore(MAX_CONCURRENCY)` limits concurrent Claude API calls
- Each scoring task gets its own `AsyncSession` (never shares sessions across tasks)
- Background tasks started with `asyncio.create_task()` — persist beyond the HTTP response lifetime
- Frontend polls HTTP endpoints for progress (no WebSockets needed at demo scale)

## Scoring Formula

```
overall_score = Σ(weight_i × category_score_i) / total_weight
```

- Default weights: Skills 35%, Experience 30%, Education 20%, Domain Fit 15%
- Weights are editable per job; must sum to 100
- Claude provides scores 0-100 for each category
- Deterministic and transparent — no ML models involved in the final number

## LLM Integration

Uses Anthropic Python SDK v0.50+ with `output_format=PydanticModel` for structured outputs.
This guarantees the response matches the schema, eliminating JSON parsing errors.

Two calls per job/candidate lifecycle:
1. `extract_requirements(job)` → `ExtractionResult` (once per job creation)
2. `evaluate_candidate(job, requirements, cv_text)` → `EvaluationResult` (once per candidate, re-runnable)
