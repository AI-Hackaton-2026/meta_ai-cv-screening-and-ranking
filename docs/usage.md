# Recruiter User Guide

## Workflow Overview

```
Create Job → Wait for requirement extraction → Upload CVs → View ranked leaderboard
          → Drilldown into candidates → Compare shortlist → Export
```

---

## 1. Create a Job

1. Click **New Job** on the Jobs page
2. Enter a job title and paste the full job description
3. Click **Create Job**

MetaHire immediately sends the job description to Claude AI, which extracts:
- **Must-have requirements** — hard qualifications that eliminate unqualified candidates
- **Nice-to-have requirements** — valuable but not blocking
- **Suggested scoring weights** — how much each category should count

You will see a "Extracting requirements…" indicator while this runs (typically 5-15 seconds).

---

## 2. Upload CVs

On the Job Detail page:

1. Drag & drop files onto the upload zone, or click to browse
2. Supported formats: **PDF** and **DOCX**
3. You can upload **multiple files at once** (batch)
4. Click **Upload** to submit

Each CV is queued immediately and scored in the background. The leaderboard updates in real time as candidates are processed.

---

## 3. Reading the Leaderboard

The leaderboard shows:

| Column | What it means |
|---|---|
| Rank | Order by overall score (highest first) |
| Candidate | Name extracted from CV, original filename |
| Score | Overall score bar (weighted average, 0-100) |
| Recommendation | Advance / Hold / Reject |
| Skills / Exp. / Edu. / Domain | Per-category mini-scores |
| Status | Queued → Scoring → Done / Error |

- **Green row**: Advance recommendation
- **Amber row**: Hold recommendation
- **Red row**: Reject recommendation

Click any **Done** row to open the candidate drilldown.

---

## 4. Candidate Drilldown

The drilldown shows:

- **Overall score** and **recommendation** at a glance
- **Recruiter summary** — 2-3 sentences explaining the recommendation
- **Radar chart** — visual of all four category scores
- **Category detail** — per-category score with Claude's rationale
- **Strengths & Gaps** — role-specific strengths and concerns
- **Requirement checklist** — each job requirement marked met/partial/unmet with a verbatim evidence quote from the CV
- **Full reasoning** — expandable section with Claude's complete evaluation logic

Use the **Rescore** button to re-run the evaluation (useful after editing scoring weights).

---

## 5. Compare Candidates

To compare up to 4 candidates side-by-side:

1. Check the checkbox next to each candidate in the leaderboard
2. A **Compare** button appears in the header when ≥ 2 are selected
3. Click it to open the side-by-side comparison view

The comparison shows: overall score, recommendation, all category scores, and requirement match summary for each candidate.

---

## 6. Editing Scoring Weights

Scoring weights control how much each category contributes to the overall score. Defaults (set by Claude based on the job description) can be edited:

1. On the Job Detail page, expand **Scoring Weights**
2. Adjust the sliders — the total must equal 100%
3. Click **Save Weights**
4. Use **Rescore** on individual candidates (or they will use the new weights next time they are scored)

This is useful for roles where, for example, domain expertise matters much more than formal education.

---

## 7. Export

### Shortlist CSV

Click **Export CSV** on the Job Detail page to download all evaluated candidates ranked by score, including all category scores, recommendations, and summaries.

### Candidate PDF Report

In the candidate drilldown, click **Export PDF** to download a formatted evaluation report for that candidate. Useful for sharing with hiring managers.

---

## Tips for Better Results

- **Use detailed job descriptions**: The more specific the description, the better Claude can extract requirements and evaluate CVs against them
- **Text-based CVs only**: Scanned PDFs (images of documents) are not supported — ask candidates for digital CVs
- **Review reasoning**: Always read the AI reasoning, especially for borderline cases — the model can miss context a human would catch
- **AI is advisory**: Use scores as a starting point, not a final decision — all final hiring decisions are the recruiter's
