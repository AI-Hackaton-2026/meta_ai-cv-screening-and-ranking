import { useBatchStatus } from "@/lib/queries";

/**
 * Live batch progress bar — polls while any candidates are pending/processing.
 * Stops polling once all are done or errored.
 */
export function BatchProgress({ jobId }) {
  const { data } = useBatchStatus(jobId, {
    refetchInterval: (query) => {
      // TanStack Query v5: query.state.data
      const d = query?.state?.data;
      if (!d || d.total === 0) return false;
      const active = d.pending + d.processing;
      return active > 0 ? 2000 : false;
    },
  });

  if (!data || data.total === 0) return null;

  const { total, pending, processing, done, error } = data;
  const finished = done + error;
  const pct = total > 0 ? Math.round((finished / total) * 100) : 0;
  const active = pending + processing;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs text-[var(--color-ink-muted)]">
        <span>
          {active > 0 ? `Scoring ${processing} candidate${processing !== 1 ? "s" : ""}…` : "All scored"}
        </span>
        <span>
          {done}/{total} done{error > 0 ? ` · ${error} error${error > 1 ? "s" : ""}` : ""}
        </span>
      </div>
      <div
        className="w-full rounded-full overflow-hidden"
        style={{ height: 6, background: "var(--color-border)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: error > 0 && active === 0 ? "#D97706" : "var(--color-primary)",
          }}
        />
      </div>
    </div>
  );
}
