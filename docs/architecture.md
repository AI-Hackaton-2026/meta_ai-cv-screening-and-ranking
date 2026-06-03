# Architecture

```
Browser (React + Vite)
  /                     Jobs list, create job
  /jobs/:id             Requirements, upload, leaderboard, weights, compare
  /candidates/:id       Evaluation detail, rescore, export
        │
        ▼ HTTP
FastAPI (async)
  routers/jobs.py       CRUD, upload, leaderboard, export
  routers/candidates.py Detail, rescore, interviews, CV preview, PDF
  services/claude.py    Requirement extraction + evaluation (structured output)
  services/scoring.py   Weighted overall score + batch orchestration
  services/parsing.py   PDF/DOCX → text
        │
        ├── PostgreSQL / Supabase (jobs, requirements, candidates, evaluations)
        └── Anthropic API (Claude)
```

## CV upload → score

1. `POST /jobs/{id}/candidates` — parse files, insert candidates (`pending`), return 202.
2. Background task (semaphore-limited): `processing` → Claude evaluate → save `Evaluation` → `done`.
3. Frontend polls `GET /jobs/{id}/candidates` and `GET /jobs/{id}/status`.

Upload is rejected until `extraction_status` is `done`.

## Scoring

```
overall_score = Σ(weight_i × category_score_i) / total_weight
```

Claude returns category scores (0–100); Python computes the overall number. Default weights: Skills 35%, Experience 30%, Education 20%, Domain Fit 15%.

## LLM calls

1. `extract_requirements(job)` — once per job creation.
2. `evaluate_candidate(job, requirements, cv_text)` — once per candidate (repeatable via rescore).

Both use Anthropic structured outputs (`output_format` + Pydantic schemas in `schemas.py`).
