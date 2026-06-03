# Setup & troubleshooting

## Backend

```bash
cd backend
uv sync
cp .env.example .env
```

Set `ANTHROPIC_API_KEY` in `.env`. Start the server:

```bash
uv run uvicorn app.main:app --reload --port 8000
```

SQLite is created automatically at `backend/data/metahire.db`.

### Optional: Supabase CV storage

To persist original uploaded files (recommended for cloud deploys):

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_STORAGE_BUCKET=cvs
```

Create a **private** bucket named `cvs` in Supabase. Never expose the service-role key to the frontend.

---

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Production build: set `VITE_API_URL` to your backend URL (no `/api` suffix).

---

## Demo data (CLI only)

```bash
cd backend
uv run python -m app.seed
```

This creates sample jobs from `samples/`, attaches CVs from `samples/cvs/`, runs requirement extraction, and scores candidates. **Requires a valid Anthropic API key** and may take several minutes.

---

## Troubleshooting

| Issue | Fix |
|---|---|
| Missing `ANTHROPIC_API_KEY` | Add key to `backend/.env` |
| Frontend connection refused | Start backend before frontend |
| Upload rejected (409) | Wait until job extraction status is **Ready** |
| CV scoring error / empty text | Scanned PDFs are not supported; use text-based PDF/DOCX |
| Port in use | Change uvicorn `--port` and `CORS_ORIGINS` in `.env` |
