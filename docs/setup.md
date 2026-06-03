# Setup & troubleshooting

## Backend

```bash
cd backend
uv sync
cp .env.example .env
```

Set `ANTHROPIC_API_KEY` and `DATABASE_URL` in `.env`. Start the server:

```bash
uv run uvicorn app.main:app --reload --port 8000
```

### Database (Supabase PostgreSQL)

Production uses **Supabase session pooler** (port `5432`, IPv4-compatible with Render):

```env
DATABASE_URL=postgresql://postgres.your-project-ref:your-password@aws-0-your-region.pooler.supabase.com:5432/postgres
```

Find the exact string under Supabase → **Settings → Database → Connection pooling → Session mode**.  
`postgresql://` is normalized to `postgresql+asyncpg://` automatically.

Tables are created on API startup (`create_all`).

### Render deployment

In the **backend** service on Render → **Environment**, set:

| Variable | Value |
| -------- | ----- |
| `DATABASE_URL` | Same session pooler URL as above (not the direct `db.*.supabase.co` host — IPv6-only) |

Redeploy the backend after changing `DATABASE_URL`.

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
| `SSLCertVerificationError` on startup | Use the **session pooler** `DATABASE_URL` (not `db.*.supabase.co`). Run `uv sync`. The backend falls back to `ssl=require` (encrypted, no cert verify) if full verification fails — common on Render. On macOS behind a corporate proxy, you can also set `DATABASE_SSL_INSECURE=true` in `backend/.env`. |
