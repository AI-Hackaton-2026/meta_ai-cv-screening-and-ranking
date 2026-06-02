import { X, RefreshCw, Download, CheckCircle2, MinusCircle, XCircle } from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ScoreBar } from "@/components/ScoreBar";
import { StatusBadge } from "@/components/StatusBadge";
import { useCandidate, useRescore } from "@/lib/queries";
import { candidatesApi } from "@/lib/api";
import { formatScore, recommendationLabel } from "@/lib/utils";

const CATEGORY_LABELS = {
  skills: "Skills",
  experience: "Experience",
  education: "Education",
  domain_fit: "Domain Fit",
};

const REQ_ICONS = {
  met: <CheckCircle2 size={14} className="req-met shrink-0 mt-0.5" />,
  partial: <MinusCircle size={14} className="req-partial shrink-0 mt-0.5" />,
  unmet: <XCircle size={14} className="req-unmet shrink-0 mt-0.5" />,
};

export function CandidateDrawer({ candidateId, requirements = [], onClose }) {
  const { data: candidate, isLoading } = useCandidate(candidateId);
  const { mutateAsync: rescore, isPending: rescoring } = useRescore(candidateId);

  if (!candidateId) return null;

  const handleRescore = async () => {
    try {
      await rescore();
      toast.success("Rescore queued. Results will update shortly.");
    } catch {
      toast.error("Rescore failed.");
    }
  };

  const ev = candidate?.evaluation;

  // Build radar chart data from category scores
  const radarData = Object.entries(ev?.category_scores ?? {}).map(([key, val]) => ({
    subject: CATEGORY_LABELS[key] ?? key,
    score: val?.score ?? 0,
  }));

  // Map requirement_id to requirement text for display
  const reqMap = Object.fromEntries(requirements.map((r) => [r.id, r]));

  return (
    <Dialog
      open={!!candidateId}
      onClose={onClose}
      title={isLoading ? "Loading…" : candidate?.name ?? "Candidate"}
      size="xl"
    >
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <span className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {candidate && (
        <div className="flex flex-col gap-6">
          {/* Top bar */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-[var(--color-ink-muted)]">{candidate.original_filename}</p>
              <StatusBadge status={candidate.status} />
            </div>
            <div className="flex items-center gap-2">
              {ev && (
                <a href={candidatesApi.exportPdf(candidateId)} download>
                  <Button variant="outline" size="sm">
                    <Download size={13} /> Export PDF
                  </Button>
                </a>
              )}
              <Button variant="outline" size="sm" onClick={handleRescore} loading={rescoring}>
                <RefreshCw size={13} /> Rescore
              </Button>
            </div>
          </div>

          {/* Error state */}
          {candidate.status === "error" && (
            <div className="p-4 rounded-[var(--radius-md)] bg-red-50 text-red-700 text-sm">
              <strong>Scoring error:</strong> {candidate.error}
            </div>
          )}

          {ev && (
            <>
              {/* Score + Recommendation */}
              <div className="flex items-center gap-4 p-4 rounded-[var(--radius-lg)] bg-[var(--color-primary-light)]">
                <div>
                  <p className="text-xs text-[var(--color-ink-muted)] mb-0.5">Overall Score</p>
                  <p
                    className="text-3xl font-bold tabular-nums"
                    style={{ color: "var(--color-primary)" }}
                  >
                    {formatScore(ev.overall_score)}
                  </p>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-[var(--color-ink-muted)] mb-1">Recommendation</p>
                  <Badge variant={ev.recommendation} className="text-sm px-3 py-1">
                    {recommendationLabel(ev.recommendation)}
                  </Badge>
                </div>
              </div>

              {/* Recruiter Summary */}
              <div>
                <h4 className="text-xs font-semibold text-[var(--color-ink-muted)] uppercase tracking-wide mb-2">
                  Recruiter Summary
                </h4>
                <p className="text-sm text-[var(--color-ink)] leading-relaxed">{ev.summary}</p>
              </div>

              {/* Radar + Category Scores */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Radar */}
                <div>
                  <h4 className="text-xs font-semibold text-[var(--color-ink-muted)] uppercase tracking-wide mb-2">
                    Category Overview
                  </h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="var(--color-border)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "var(--color-ink-muted)" }} />
                      <Radar
                        dataKey="score"
                        fill="var(--color-primary)"
                        fillOpacity={0.25}
                        stroke="var(--color-primary)"
                        strokeWidth={2}
                      />
                      <Tooltip
                        formatter={(v) => [`${v}/100`, "Score"]}
                        contentStyle={{
                          background: "var(--color-card)",
                          border: "1px solid var(--color-border)",
                          borderRadius: "var(--radius-md)",
                          fontSize: 12,
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* Category detail */}
                <div className="flex flex-col gap-3">
                  <h4 className="text-xs font-semibold text-[var(--color-ink-muted)] uppercase tracking-wide">
                    Category Scores
                  </h4>
                  {Object.entries(ev.category_scores).map(([key, val]) => (
                    <div key={key}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-[var(--color-ink)]">
                          {CATEGORY_LABELS[key] ?? key}
                        </span>
                      </div>
                      <ScoreBar score={val.score} />
                      <p className="text-xs text-[var(--color-ink-muted)] mt-0.5 leading-relaxed">
                        {val.rationale}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strengths + Gaps */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-[var(--radius-md)] bg-emerald-50">
                  <h4 className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">
                    Strengths
                  </h4>
                  <ul className="flex flex-col gap-1.5">
                    {(ev.strengths ?? []).map((s, i) => (
                      <li key={i} className="flex gap-2 text-sm text-emerald-800">
                        <span>•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 rounded-[var(--radius-md)] bg-red-50">
                  <h4 className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">
                    Gaps
                  </h4>
                  <ul className="flex flex-col gap-1.5">
                    {(ev.gaps ?? []).map((g, i) => (
                      <li key={i} className="flex gap-2 text-sm text-red-800">
                        <span>•</span>
                        <span>{g}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Requirement Matches */}
              {ev.requirement_matches?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-[var(--color-ink-muted)] uppercase tracking-wide mb-3">
                    Requirement Checklist
                  </h4>
                  <div className="flex flex-col gap-2">
                    {ev.requirement_matches.map((match, i) => {
                      const req = reqMap[match.requirement_id];
                      return (
                        <div
                          key={i}
                          className="flex flex-col gap-1 p-3 rounded-[var(--radius-md)] border border-[var(--color-border)]"
                        >
                          <div className="flex items-start gap-2">
                            {REQ_ICONS[match.status] ?? REQ_ICONS.unmet}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-medium text-[var(--color-ink)]">
                                  {req?.text ?? `Requirement #${match.requirement_id}`}
                                </span>
                                {req && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                    {req.kind === "must_have" ? "Must-have" : "Nice-to-have"}
                                  </span>
                                )}
                              </div>
                              {match.evidence && match.evidence !== "Not found" && (
                              <p className="text-xs text-[var(--color-ink-muted)] mt-1 italic leading-relaxed">
                                &quot;{match.evidence}&quot;
                              </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Full Reasoning */}
              <details className="group">
                <summary className="text-xs font-semibold text-[var(--color-ink-muted)] uppercase tracking-wide cursor-pointer hover:text-[var(--color-primary)] transition-colors">
                  Full Reasoning ▸
                </summary>
                <p className="mt-2 text-xs text-[var(--color-ink-muted)] leading-relaxed whitespace-pre-wrap">
                  {ev.reasoning}
                </p>
              </details>
            </>
          )}
        </div>
      )}
    </Dialog>
  );
}
