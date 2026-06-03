/**
 * TanStack Query v6 hooks.
 * All server state flows through these hooks — pages import from here,
 * never call the API directly.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { candidatesApi, jobsApi } from "./api";

// ── Query Keys ────────────────────────────────────────────────────────────────

export const keys = {
  jobs: ["jobs"],
  job: (id) => ["jobs", id],
  leaderboard: (jobId) => ["jobs", jobId, "leaderboard"],
  leaderboardPage: (jobId, params) => ["jobs", jobId, "leaderboard", params],
  batchStatus: (jobId) => ["jobs", jobId, "status"],
  candidate: (id) => ["candidates", id],
};

// ── Job queries ───────────────────────────────────────────────────────────────

export function useJobs(params = {}) {
  return useQuery({
    queryKey: [...keys.jobs, params],
    queryFn: () => jobsApi.list(params),
  });
}

export function useJob(id, options = {}) {
  return useQuery({
    queryKey: keys.job(id),
    queryFn: () => jobsApi.get(id),
    enabled: !!id,
    ...options,
  });
}

export function useLeaderboard(jobId, params = {}, options = {}) {
  return useQuery({
    queryKey: keys.leaderboardPage(jobId, params),
    queryFn: () => jobsApi.getLeaderboard(jobId, params),
    enabled: !!jobId,
    ...options,
  });
}

export function useBatchStatus(jobId, options = {}) {
  return useQuery({
    queryKey: keys.batchStatus(jobId),
    queryFn: () => jobsApi.getBatchStatus(jobId),
    enabled: !!jobId,
    gcTime: 30_000,
    ...options,
  });
}

// ── Job mutations ─────────────────────────────────────────────────────────────

export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: jobsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.jobs }),
  });
}

export function useUpdateJob(jobId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => jobsApi.update(jobId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.job(jobId) });
    },
  });
}

export function useDeleteJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => jobsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.jobs }),
  });
}

export function useUploadCandidates(jobId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (files) => jobsApi.uploadCandidates(jobId, files),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.leaderboard(jobId) });
      qc.invalidateQueries({ queryKey: keys.batchStatus(jobId) });
    },
  });
}

// ── Candidate queries/mutations ───────────────────────────────────────────────

export function useCandidate(id) {
  return useQuery({
    queryKey: keys.candidate(id),
    queryFn: () => candidatesApi.get(id),
    enabled: !!id,
  });
}

export function useRescore(candidateId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => candidatesApi.rescore(candidateId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.candidate(candidateId) });
    },
  });
}

export function useScheduleInterview(candidateId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => candidatesApi.scheduleInterview(candidateId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.candidate(candidateId) });
    },
  });
}

export function useRescoreForJob(jobId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (candidateId) => candidatesApi.rescore(candidateId),
    onSuccess: (_, candidateId) => {
      qc.invalidateQueries({ queryKey: keys.candidate(candidateId) });
      qc.invalidateQueries({ queryKey: keys.leaderboard(jobId) });
      qc.invalidateQueries({ queryKey: keys.batchStatus(jobId) });
    },
  });
}

export function useDeleteCandidateForJob(jobId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (candidateId) => candidatesApi.delete(candidateId),
    onSuccess: (_, candidateId) => {
      qc.removeQueries({ queryKey: keys.candidate(candidateId) });
      qc.invalidateQueries({ queryKey: keys.leaderboard(jobId) });
      qc.invalidateQueries({ queryKey: keys.batchStatus(jobId) });
      qc.invalidateQueries({ queryKey: keys.jobs });
    },
  });
}
