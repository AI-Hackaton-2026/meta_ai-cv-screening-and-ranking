/**
 * Axios instance + all API endpoint helpers.
 * The base URL is /api which Vite proxies to http://localhost:8000 in dev,
 * and to the real backend URL in production (set VITE_API_URL in env).
 */

import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL ?? "/api";

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// ── Jobs ─────────────────────────────────────────────────────────────────────

export const jobsApi = {
  list: (params = {}) => apiClient.get("/jobs", { params }).then((r) => r.data),
  get: (id) => apiClient.get(`/jobs/${id}`).then((r) => r.data),
  create: (data) => apiClient.post("/jobs", data).then((r) => r.data),
  update: (id, data) => apiClient.patch(`/jobs/${id}`, data).then((r) => r.data),
  delete: (id) => apiClient.delete(`/jobs/${id}`),

  uploadCandidates: (jobId, files) => {
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    return apiClient
      .post(`/jobs/${jobId}/candidates`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },

  getLeaderboard: (jobId, params = {}) =>
    apiClient.get(`/jobs/${jobId}/candidates`, { params }).then((r) => r.data),

  getBatchStatus: (jobId) =>
    apiClient.get(`/jobs/${jobId}/status`).then((r) => r.data),

  exportCsv: (jobId) => `${BASE_URL}/jobs/${jobId}/export?format=csv`,
};

// ── Candidates ───────────────────────────────────────────────────────────────

export const candidatesApi = {
  get: (id) => apiClient.get(`/candidates/${id}`).then((r) => r.data),
  rescore: (id) => apiClient.post(`/candidates/${id}/rescore`).then((r) => r.data),
  delete: (id) => apiClient.delete(`/candidates/${id}`),
  previewCv: (id) => `${BASE_URL}/candidates/${id}/cv-preview`,
  exportPdf: (id) => `${BASE_URL}/candidates/${id}/export?format=pdf`,
};
