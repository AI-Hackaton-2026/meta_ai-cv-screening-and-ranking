/**
 * TanStack Query v6 hooks.
 * All server state flows through these hooks — pages import from here,
 * never call the API directly.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { candidatesApi, jobsApi, seedApi } from "./api";

// ── Query Keys ────────────────────────────────────────────────────────────────

export const keys = {
  jobs: ["jobs"],
  job: (id) => ["jobs", id],
  leaderboard: (jobId) => ["jobs", jobId, "leaderboard"],
  batchStatus: (jobId) => ["jobs", jobId, "status"],
  candidate: (id) => ["candidates", id],
};

// ── Job queries ───────────────────────────────────────────────────────────────

export function useJobs() {
  return useQuery({
    queryKey: keys.jobs,
    queryFn: jobsApi.list,
  });
}

export function useJob(id) {
  return useQuery({
    queryKey: keys.job(id),
    queryFn: () => jobsApi.get(id),
    enabled: !!id,
  });
}

export function useLeaderboard(jobId, options = {}) {
  return useQuery({
    queryKey: keys.leaderboard(jobId),
    queryFn: () => jobsApi.getLeaderboard(jobId),
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

// ── Demo seed ─────────────────────────────────────────────────────────────────

export function useSeed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: seedApi.run,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.jobs }),
  });
}
