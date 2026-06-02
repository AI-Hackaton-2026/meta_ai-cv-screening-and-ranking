import { useCandidate } from "@/lib/queries";
import { Dialog } from "@/components/ui/Dialog";
import { ScoreBar } from "@/components/ScoreBar";
import { Badge } from "@/components/ui/Badge";
import { formatScore, recommendationLabel } from "@/lib/utils";
import { CheckCircle2, MinusCircle, XCircle } from "lucide-react";

const CATEGORY_LABELS = {
  skills: "Skills",
  experience: "Experience",
  education: "Education",
  domain_fit: "Domain Fit",
};

const REQ_ICONS = {
  met: <CheckCircle2 size={12} className="req-met shrink-0" />,
  partial: <MinusCircle size={12} className="req-partial shrink-0" />,
  unmet: <XCircle size={12} className="req-unmet shrink-0" />,
};

function CandidateColumn({ candidateId }) {
  const { data, isLoading } = useCandidate(candidateId);

  if (isLoading) return (
    <div className="flex-1 flex items-center justify-center py-12">
      <span className="w-5 h-5 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const ev = data?.evaluation;

  return (
    <div className="flex-1 min-w-0">
      {/* Header */}
      <div className="mb-4 pb-3 border-b border-[var(--color-border)]">
        <p className="text-sm font-semibold text-[var(--color-ink)] truncate">{data?.name}</p>
        <p className="text-xs text-[var(--color-ink-muted)] truncate">{data?.original_filename}</p>
      </div>

      {!ev ? (
        <p className="text-xs text-[var(--color-ink-muted)]">No evaluation yet.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Overall */}
          <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-primary-light)] text-center">
            <p className="text-2xl font-bold tabular-nums" style={{ color: "var(--color-primary)" }}>
              {formatScore(ev.overall_score)}
            </p>
            <Badge variant={ev.recommendation} className="mt-1">
              {recommendationLabel(ev.recommendation)}
            </Badge>
          </div>

          {/* Category scores */}
          <div className="flex flex-col gap-2">
            {Object.entries(ev.category_scores ?? {}).map(([key, val]) => (
              <div key={key}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-[var(--color-ink-muted)]">{CATEGORY_LABELS[key] ?? key}</span>
                </div>
                <ScoreBar score={val?.score} />
              </div>
            ))}
          </div>

          {/* Requirement matches */}
          {ev.requirement_matches?.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold text-[var(--color-ink-muted)] uppercase tracking-wide">
                Requirements
              </p>
              {ev.requirement_matches.map((m, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  {REQ_ICONS[m.status] ?? REQ_ICONS.unmet}
                  <span className="text-xs text-[var(--color-ink)] truncate">
                    Req #{m.requirement_id}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Summary */}
          <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed">{ev.summary}</p>
        </div>
      )}
    </div>
  );
}

export function CompareView({ candidateIds, onClose }) {
  if (!candidateIds?.length) return null;

  return (
    <Dialog
      open={candidateIds.length > 0}
      onClose={onClose}
      title={`Compare ${candidateIds.length} Candidates`}
      size="full"
    >
      <div className="flex gap-6 overflow-x-auto pb-2">
        {candidateIds.map((id) => (
          <CandidateColumn key={id} candidateId={id} />
        ))}
      </div>
    </Dialog>
  );
}
