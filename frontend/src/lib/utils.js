import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind classes safely, resolving conflicts.
 * Used by all shadcn/ui components and throughout the app.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/** Format a score number to one decimal place, or return "–" if null/undefined. */
export function formatScore(score) {
  if (score === null || score === undefined) return "–";
  return Number(score).toFixed(1);
}

/** Map a recommendation value to a CSS badge class. */
export function recommendationClass(rec) {
  return { advance: "badge-advance", hold: "badge-hold", reject: "badge-reject" }[rec] ?? "";
}

/** Human-readable recommendation label. */
export function recommendationLabel(rec) {
  return { advance: "Advance", hold: "Hold", reject: "Reject" }[rec] ?? rec ?? "–";
}

/** Candidate status to human-readable label + colour. */
export function statusMeta(status) {
  const map = {
    pending: { label: "Queued", color: "#9090A0" },
    processing: { label: "Scoring…", color: "#726BFF" },
    done: { label: "Done", color: "#059669" },
    error: { label: "Error", color: "#DC2626" },
  };
  return map[status] ?? { label: status, color: "#9090A0" };
}

/** Score 0-100 to a colour (red → amber → green). */
export function scoreColor(score) {
  if (score === null || score === undefined) return "#D9D9D9";
  if (score >= 75) return "#059669";
  if (score >= 55) return "#D97706";
  return "#DC2626";
}
