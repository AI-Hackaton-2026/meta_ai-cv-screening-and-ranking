# Setup Guide

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Python | 3.12 | Use pyenv or official installer |
| uv | latest | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| Node.js | 22 LTS | [nodejs.org](https://nodejs.org) |
| npm | 10+ | Bundled with Node |
| Anthropic API key | — | Required — get one at [console.anthropic.com](https://console.anthropic.com) |

---

## Backend Setup

```bash
cd backend

# 1. Install Python dependencies
uv sync

# 2. Create your environment file
cp .env.example .env
```

Open `backend/.env` and fill in:

```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

The other variables have sensible defaults for local development.

```bash
# 3. Start the server
uv run uvicorn app.main:app --reload --port 8000
```

The server will:
- Create the SQLite database at `backend/data/metahire.db` automatically
- Print `MetaHire API started` in the terminal
- Serve interactive API docs at http://localhost:8000/docs

---

## Frontend Setup

```bash
cd frontend

# 1. Install Node dependencies
npm install

# 2. Start the dev server
npm run dev
```

The app will open at **http://localhost:5173**. The Vite dev server proxies `/api/*` to the backend automatically.

---

## Loading Demo Data

### Option 1: UI button

Click **"Load Sample Data"** on the Jobs page.

### Option 2: Generate + seed manually

```bash
# Generate sample CV PDFs (only needed once, if samples/cvs/ is empty)
cd backend
uv run python ../samples/create_sample_cvs.py

# Seed via API
curl -X POST http://localhost:8000/seed
```

This creates 2 sample jobs and attaches 8 candidate CVs of varying quality.

---

## Troubleshooting

### "Missing ANTHROPIC_API_KEY"

The app validates this on startup. Check that `backend/.env` exists and contains a valid key starting with `sk-ant-`.

### "Connection refused" from frontend

The backend must be running before the frontend can fetch data. Start the backend first.

### Scanned PDFs show no score

The PDF parser extracts text from text-based PDFs only. Scanned PDFs (images) return empty text, which is flagged as an error. Use the sample CVs in `samples/cvs/` which are all text-based.

### Port conflicts

- Backend: change `--port 8000` in the uvicorn command and update `CORS_ORIGINS` in `.env`
- Frontend: Vite will auto-increment the port if 5173 is taken; update the Vite proxy target if you change the backend port

---

## Pre-commit hooks (optional)

If you want local lint checks on every commit:

```bash
pip install pre-commit
pre-commit install
```
