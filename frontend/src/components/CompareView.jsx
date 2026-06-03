import { useLayoutEffect, useRef, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { CheckCircle2, MinusCircle, XCircle } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { ScoreBar } from "@/components/ScoreBar";
import { keys } from "@/lib/queries";
import { candidatesApi } from "@/lib/api";
import { cn, formatScore } from "@/lib/utils";

const CATEGORY_LABELS = {
  skills: "Skills",
  experience: "Experience",
  education: "Education",
  domain_fit: "Domain Fit",
};

const CATEGORIES = ["skills", "experience", "education", "domain_fit"];

const STATUS_META = {
  met: { label: "Met", Icon: CheckCircle2, className: "mh-compare-status--met" },
  partial: { label: "Partial", Icon: MinusCircle, className: "mh-compare-status--partial" },
  unmet: { label: "Unmet", Icon: XCircle, className: "mh-compare-status--unmet" },
};

function sortRequirements(requirements) {
  const order = { must_have: 0, nice_to_have: 1 };
  return [...requirements].sort((a, b) => {
    const ka = order[a.kind] ?? 2;
    const kb = order[b.kind] ?? 2;
    if (ka !== kb) return ka - kb;
    return a.id - b.id;
  });
}

function buildMatchMap(matches) {
  return Object.fromEntries((matches ?? []).map((m) => [m.requirement_id, m]));
}

function SummaryCell({ summary }) {
  const [expanded, setExpanded] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const textRef = useRef(null);
  const text = summary?.trim();

  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el || expanded) return;
    setTruncated(el.scrollHeight > el.clientHeight + 1);
  }, [text, expanded]);

  if (!text) {
    return <p className="mh-compare-summary__text">—</p>;
  }

  const showToggle = truncated || expanded;

  return (
    <div className={cn("mh-compare-summary", expanded && "is-expanded")}>
      <p ref={textRef} className="mh-compare-summary__text">
        {text}
      </p>
      {showToggle && (
        <button
          type="button"
          className="mh-compare-summary__toggle"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Read less" : "Read more"}
        </button>
      )}
    </div>
  );
}

function ReqStatusCell({ match }) {
  if (!match) {
    return <span className="mh-compare-status mh-compare-status--empty">—</span>;
  }

  const meta = STATUS_META[match.status] ?? STATUS_META.unmet;
  const { Icon, label, className } = meta;
  const hasEvidence = match.evidence && match.evidence !== "Not found";

  return (
    <div className={`mh-compare-status ${className}`}>
      <span className="mh-compare-status__head">
        <Icon size={14} aria-hidden />
        <span>{label}</span>
      </span>
      {hasEvidence && (
        <p className="mh-compare-status__evidence" title={match.evidence}>
          &ldquo;{match.evidence}&rdquo;
        </p>
      )}
    </div>
  );
}

function CompareRow({ children, className }) {
  return <div className={cn("mh-compare-row", className)}>{children}</div>;
}

function CompareLabel({ children, className, hidden }) {
  return (
    <div
      className={cn("mh-compare-cell mh-compare-cell--label", className)}
      aria-hidden={hidden || undefined}
    >
      {children}
    </div>
  );
}

function CompareCol({ children, className }) {
  return <div className={cn("mh-compare-cell mh-compare-cell--data", className)}>{children}</div>;
}

function SectionTitle({ children }) {
  return <h3 className="mh-compare-block__title">{children}</h3>;
}

export function CompareView({ candidateIds, requirements = [], onClose }) {
  const queries = useQueries({
    queries: (candidateIds ?? []).map((id) => ({
      queryKey: keys.candidate(id),
      queryFn: () => candidatesApi.get(id),
      enabled: !!id,
    })),
  });

  if (!candidateIds?.length) return null;

  const isLoading = queries.some((q) => q.isLoading);
  const candidates = queries.map((q) => q.data).filter(Boolean);
  const colCount = candidates.length;
  const sortedReqs = sortRequirements(requirements);
  const layoutStyle = { "--mh-compare-cols": colCount || candidateIds.length };

  return (
    <Dialog
      open={candidateIds.length > 0}
      onClose={onClose}
      title={`Compare ${candidateIds.length} candidates`}
      size="full"
      className="mh-compare-dialog"
      bodyClassName="mh-compare-body"
      style={layoutStyle}
    >
      {isLoading && (
        <div className="mh-compare-loading">
          <span className="mh-spinner" />
          <span className="text-sm text-[var(--muted-foreground)]">Loading evaluations…</span>
        </div>
      )}

      {!isLoading && colCount > 0 && (
        <div className="mh-compare-layout" style={layoutStyle}>
          <section className="mh-compare-block mh-compare-block--hero">
            <CompareRow className="mh-compare-row--hero">
              {candidates.map((c) => {
                const ev = c.evaluation;
                return (
                  <CompareCol key={c.id}>
                    <article className="mh-compare-hero">
                      <p className="mh-compare-hero__name">{c.name}</p>
                      {ev ? (
                        <p className="mh-compare-hero__score mono">
                          {formatScore(ev.overall_score)}
                        </p>
                      ) : (
                        <p className="mh-compare-hero__pending">No evaluation yet</p>
                      )}
                    </article>
                  </CompareCol>
                );
              })}
            </CompareRow>
          </section>

          <section className="mh-compare-block">
            <SectionTitle>Category scores</SectionTitle>
            <div className="mh-compare-block__body">
              {CATEGORIES.map((cat) => (
                <CompareRow key={cat}>
                  <CompareLabel>{CATEGORY_LABELS[cat]}</CompareLabel>
                  {candidates.map((c) => {
                    const score = c.evaluation?.category_scores?.[cat]?.score;
                    return (
                      <CompareCol key={c.id}>
                        <ScoreBar score={score} height={5} />
                      </CompareCol>
                    );
                  })}
                </CompareRow>
              ))}
            </div>
          </section>

          <section className="mh-compare-block">
            <SectionTitle>Recruiter summary</SectionTitle>
            <div className="mh-compare-block__body">
              <CompareRow>
                <CompareLabel>Summary</CompareLabel>
                {candidates.map((c) => (
                  <CompareCol key={c.id}>
                    <SummaryCell summary={c.evaluation?.summary} />
                  </CompareCol>
                ))}
              </CompareRow>
            </div>
          </section>

          {sortedReqs.length > 0 && (
            <section className="mh-compare-block mh-compare-block--reqs">
              <div className="mh-compare-block__title-row">
                <SectionTitle>Requirements</SectionTitle>
                <div className="mh-compare-legend" aria-hidden>
                  {Object.values(STATUS_META).map(({ label, Icon, className }) => (
                    <span key={label} className={`mh-compare-legend__item ${className}`}>
                      <Icon size={12} />
                      {label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mh-compare-reqs-scroll">
                <div className="mh-compare-block__body">
                  {sortedReqs.map((req) => (
                    <CompareRow key={req.id} className="mh-compare-row--req">
                      <CompareLabel className="mh-compare-req">
                        <span
                          className={`mh-compare-req-kind ${
                            req.kind === "must_have"
                              ? "mh-compare-req-kind--must"
                              : "mh-compare-req-kind--nice"
                          }`}
                        >
                          {req.kind === "must_have" ? "Must-have" : "Nice-to-have"}
                        </span>
                        <span className="mh-compare-req-text">{req.text}</span>
                      </CompareLabel>
                      {candidates.map((c) => {
                        const matchMap = buildMatchMap(c.evaluation?.requirement_matches);
                        return (
                          <CompareCol key={c.id}>
                            <ReqStatusCell match={matchMap[req.id]} />
                          </CompareCol>
                        );
                      })}
                    </CompareRow>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      )}
    </Dialog>
  );
}
