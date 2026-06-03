# API reference

Interactive docs: **http://localhost:8000/docs** when the backend is running.

- **Dev base URL:** `http://localhost:8000`
- **Via Vite proxy:** `http://localhost:5173/api` → backend root

## Jobs

| Method | Path | Description |
|---|---|---|
| `POST` | `/jobs` | Create job; starts requirement extraction |
| `GET` | `/jobs` | List jobs (paginated; supports `search`, `cursor`, `limit`) |
| `GET` | `/jobs/{id}` | Job + requirements |
| `PATCH` | `/jobs/{id}` | Update title, description, or `category_weights` (must sum to 100) |
| `DELETE` | `/jobs/{id}` | Delete job and candidates |
| `POST` | `/jobs/{id}/candidates` | Upload CVs (`multipart/form-data`, field `files`). **409** if extraction not finished |
| `GET` | `/jobs/{id}/candidates` | Leaderboard (paginated; poll while scoring) |
| `GET` | `/jobs/{id}/status` | Batch counts: `pending`, `processing`, `done`, `error` |
| `GET` | `/jobs/{id}/export?format=csv` | Shortlist CSV download |

## Candidates

| Method | Path | Description |
|---|---|---|
| `GET` | `/candidates/{id}` | Full detail + evaluation |
| `POST` | `/candidates/{id}/rescore` | Re-queue Claude scoring |
| `POST` | `/candidates/{id}/interviews` | Send interview invite (requires Mailjet env) |
| `GET` | `/candidates/{id}/cv-preview` | CV preview (PDF inline / DOCX as text) |
| `GET` | `/candidates/{id}/export?format=pdf` | Evaluation PDF download |

## Meta

| Method | Path | Description |
|---|---|---|
| `GET` / `HEAD` | `/health` | Health check |
