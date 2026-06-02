# API Reference

Full interactive documentation is available at **http://localhost:8000/docs** (Swagger UI) when the backend is running.

## Base URL

- Development: `http://localhost:8000`
- Via Vite proxy: `http://localhost:5173/api`

---

## Jobs

### `POST /jobs`
Create a new job. Triggers async requirement extraction in background.

**Body:** `{ "title": "string", "description": "string" }`

**Response 201:** Job object with `id`, `extraction_status: "pending"`, etc.

---

### `GET /jobs`
List all jobs with candidate counts.

**Response 200:** Array of `{ id, title, extraction_status, created_at, candidate_count }`

---

### `GET /jobs/{id}`
Full job detail including requirements.

**Response 200:** Job object with nested `requirements[]`

---

### `PATCH /jobs/{id}`
Update job title, description, or category weights.

**Body:** Any subset of `{ "title", "description", "category_weights" }`

Note: `category_weights` must sum to 100 or returns 422.

---

### `DELETE /jobs/{id}`
Delete a job and all its candidates (cascade).

**Response 204**

---

### `POST /jobs/{id}/candidates`
Upload one or more CV files for scoring.

**Content-Type:** `multipart/form-data`
**Field:** `files` (one or more PDF/DOCX files)

**Response 202:**
```json
{
  "queued": 3,
  "candidate_ids": [1, 2, 3],
  "errors": []
}
```

---

### `GET /jobs/{id}/candidates`
Leaderboard — sorted by overall_score descending. Poll this for live updates.

**Response 200:** Array of leaderboard entries (no `raw_text`)

---

### `GET /jobs/{id}/status`
Batch processing progress.

**Response 200:** `{ "total": 5, "pending": 1, "processing": 2, "done": 2, "error": 0 }`

---

### `GET /jobs/{id}/export?format=csv`
Download shortlist CSV.

**Response 200:** `text/csv` attachment

---

## Candidates

### `GET /candidates/{id}`
Full candidate detail including evaluation.

**Response 200:** Candidate with nested `evaluation` object

---

### `POST /candidates/{id}/rescore`
Re-run Claude scoring for a candidate (e.g. after weight changes).

**Response 202:** `{ "message": "Rescore queued", "candidate_id": 1 }`

---

### `GET /candidates/{id}/export?format=pdf`
Download PDF evaluation report.

**Response 200:** `application/pdf` attachment

---

## Utility

### `GET /health`
Health check.

**Response 200:** `{ "status": "ok", "model": "claude-sonnet-4-5" }`

---

### `POST /seed`
Load sample jobs and CVs for demo.

**Response 202:** `{ "message": "Seeding started in background" }`
