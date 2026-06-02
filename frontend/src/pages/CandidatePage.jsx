import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Download,
  Eye,
  FileText,
  ListChecks,
  Loader2,
  Minus,
  MinusCircle,
  RefreshCw,
  TrendingUp,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ScoreBar } from "@/components/ScoreBar";
import { StatusBadge } from "@/components/StatusBadge";
import { useCandidate, useJob, useRescore } from "@/lib/queries";
import { candidatesApi } from "@/lib/api";
import { formatScore, recommendationLabel } from "@/lib/utils";

const CAT_ORDER = ["skills", "experience", "education", "domain_fit"];
const CAT_META = {
  skills: { label: "Skills", short: "Skills" },
  experience: { label: "Experience", short: "Exp." },
  education: { label: "Education", short: "Edu." },
  domain_fit: { label: "Domain Fit", short: "Domain" },
};

const REQ_META = {
  met: {
    label: "Met",
    icon: CheckCircle2,
    color: "var(--success-strong)",
    className: "met",
  },
  partial: {
    label: "Partial",
    icon: MinusCircle,
    color: "var(--warning)",
    className: "partial",
  },
  unmet: {
    label: "Not met",
    icon: XCircle,
    color: "var(--destructive-strong)",
    className: "unmet",
  },
};

export default function CandidatePage() {
  const { id } = useParams();
  const candidateId = Number(id);
  const navigate = useNavigate();
  const { data: candidate, isLoading } = useCandidate(candidateId);
  const { data: job } = useJob(candidate?.job_id);
  const { mutateAsync: rescore, isPending: rescoring } = useRescore(candidateId);
  const [showCvPreview, setShowCvPreview] = useState(false);

  const evaluation = candidate?.evaluation;

  const reqMap = useMemo(
    () => Object.fromEntries((job?.requirements ?? []).map((requirement) => [requirement.id, requirement])),
    [job?.requirements]
  );

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else if (candidate?.job_id) {
      navigate(`/jobs/${candidate.job_id}`);
    } else {
      navigate("/");
    }
  };

  const handleRescore = async () => {
    try {
      await rescore();
      toast.success("Rescore queued. Results will update shortly.");
    } catch {
      toast.error("Rescore failed.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 gap-2 text-[var(--muted-foreground)]">
        <Loader2 size={20} className="animate-spin" />
        <span className="text-sm">Loading candidate…</span>
      </div>
    );
  }

  if (!candidate) {
    return <p className="text-sm text-[var(--muted-foreground)]">Candidate not found.</p>;
  }

  const metCount =
    evaluation?.requirement_matches?.filter((match) => match.status === "met").length ?? 0;
  const totalMatches = evaluation?.requirement_matches?.length ?? 0;

  return (
    <div className="mh-page">
      <button className="mh-btn mh-btn-ghost mh-btn-sm mh-back-btn" onClick={handleBack}>
        <ArrowLeft size={16} />
        Back to leaderboard
      </button>

      <div className="mh-pagehead mh-candidate-pagehead">
        <div className="mh-cand-head">
          <span className="mh-cand-big-avatar" style={{ background: avatarColor(candidate.name) }}>
            {initials(candidate.name)}
          </span>
          <div>
            <h1 className="mh-page-title mh-candidate-title">{candidate.name}</h1>
            <div className="mh-candidate-meta">
              <span className="mh-meta">
                <FileText size={13} />
                {candidate.original_filename}
              </span>
              <StatusBadge status={candidate.status} />
            </div>
          </div>
        </div>

        <div className="mh-row">
          {candidate.has_cv_preview && (
            <Button
              variant="outline"
              size="md"
              onClick={() => setShowCvPreview((current) => !current)}
            >
              <Eye size={15} />
              {showCvPreview ? "Hide CV" : "Preview CV"}
            </Button>
          )}
          {evaluation && (
            <a href={candidatesApi.exportPdf(candidateId)} download>
              <Button variant="outline" size="md">
                <Download size={15} />
                Export PDF
              </Button>
            </a>
          )}
          <Button variant="outline" size="md" onClick={handleRescore} loading={rescoring}>
            {!rescoring && <RefreshCw size={15} />}
            Rescore
          </Button>
        </div>
      </div>

      {showCvPreview && candidate.has_cv_preview && (
        <Card className="mh-cv-preview-card">
          <SectionHead icon={<FileText size={15} />} title="CV preview" />
          <iframe
            className="mh-cv-preview-frame"
            src={candidatesApi.previewCv(candidateId)}
            title={`${candidate.name} CV preview`}
          />
        </Card>
      )}

      {candidate.status === "error" && (
        <Card className="mb-5 border-red-200 bg-red-50">
          <p className="text-sm text-red-700">
            <strong>Scoring error:</strong> {candidate.error ?? "Unable to evaluate this CV."}
          </p>
        </Card>
      )}

      {!evaluation ? (
        <Card>
          <p className="text-sm text-[var(--muted-foreground)]">
            Evaluation is not available yet.
          </p>
        </Card>
      ) : (
        <>
          <div className="mh-cand-grid">
            <Card className="mh-radar-card">
              <SectionHead title="Category overview" />
              <div className="mh-radar-wrap">
                <Radar scores={evaluation.category_scores} />
              </div>
            </Card>

            <div className="mh-stack">
              <div className="mh-scorecard">
                <div>
                  <p className="mh-scorecard-label">Overall score</p>
                  <p className="mh-bigscore mono">{formatScore(evaluation.overall_score)}</p>
                </div>
                <div className="mh-scorecard-divider" />
                <div>
                  <p className="mh-scorecard-label">Recommendation</p>
                  <Badge variant={evaluation.recommendation} className="mh-rec-badge">
                    {recommendationLabel(evaluation.recommendation)}
                  </Badge>
                </div>
              </div>

              <Card className="mh-summary-card">
                <SectionHead icon={<ClipboardList size={15} />} title="Recruiter summary" />
                <p className="mh-summary-text">{evaluation.summary}</p>
              </Card>
            </div>
          </div>

          <Card className="mh-candidate-section">
            <SectionHead
              icon={<BarChart3 size={15} />}
              title="Category scores"
              right="Tap a row for rationale"
            />
            <div className="mh-cat-list">
              {CAT_ORDER.map((key, index) => {
                const data = evaluation.category_scores?.[key];
                if (!data) return null;
                return <CategoryRow key={key} cat={key} data={data} index={index} />;
              })}
            </div>
          </Card>

          {totalMatches > 0 && (
            <Card className="mh-candidate-section">
              <SectionHead
                icon={<ListChecks size={15} />}
                title="Requirement checklist"
                right={`${metCount}/${totalMatches} met`}
              />
              <div className="mh-req-list">
                {evaluation.requirement_matches.map((match, index) => {
                  const req = reqMap[match.requirement_id];
                  const meta = REQ_META[match.status] ?? REQ_META.unmet;
                  const ReqIcon = meta.icon;

                  return (
                    <div key={`${match.requirement_id}-${index}`} className={`mh-reqcard ${meta.className}`}>
                      <ReqIcon size={20} style={{ color: meta.color, marginTop: 1 }} />
                      <div className="min-w-0 flex-1">
                        <div className="mh-req-title-row">
                          <span className="mh-req-title">
                            {req?.text ?? `Requirement #${match.requirement_id}`}
                          </span>
                          {req && (
                            <Badge variant="muted">
                              {req.kind === "must_have" ? "Must-have" : "Nice-to-have"}
                            </Badge>
                          )}
                          <span className="mh-req-status" style={{ color: meta.color }}>
                            {meta.label}
                          </span>
                        </div>
                        {match.evidence && match.evidence !== "Not found" ? (
                          <p className="mh-req-quote">&quot;{match.evidence}&quot;</p>
                        ) : (
                          <p className="mh-req-missing">No supporting evidence found in the CV.</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          <div className="mh-sg-grid">
            <div className="mh-sg good">
              <div className="mh-sg-head" style={{ color: "var(--success-strong)" }}>
                <TrendingUp size={15} />
                Strengths
              </div>
              <ul>
                {(evaluation.strengths ?? []).map((strength, index) => (
                  <li key={index} style={{ color: "var(--success-strong)" }}>
                    <Check size={15} strokeWidth={2.5} style={{ marginTop: 1 }} />
                    <span style={{ color: "var(--secondary-foreground)" }}>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mh-sg bad">
              <div className="mh-sg-head" style={{ color: "var(--destructive-strong)" }}>
                <TriangleAlert size={15} />
                Gaps
              </div>
              <ul>
                {(evaluation.gaps ?? []).map((gap, index) => (
                  <li key={index}>
                    <Minus
                      size={15}
                      strokeWidth={2.5}
                      style={{ marginTop: 1, color: "var(--destructive-strong)" }}
                    />
                    <span style={{ color: "var(--secondary-foreground)" }}>{gap}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SectionHead({ icon, title, right }) {
  return (
    <div className="mh-sec-head">
      <p className="mh-sec-title">
        {icon}
        {title}
      </p>
      {right && <span className="mh-section-right">{right}</span>}
    </div>
  );
}

function CategoryRow({ cat, data, index }) {
  const [open, setOpen] = useState(index === 0);

  return (
    <div className={`mh-catrow ${open ? "open" : ""}`}>
      <button className="mh-cathead" onClick={() => setOpen((current) => !current)}>
        <span className="mh-catname">{CAT_META[cat].label}</span>
        <ScoreBar score={data.score} height={8} showLabel={false} />
        <span className="mh-cat-score-wrap">
          <span className="mono mh-cat-score">{formatScore(data.score)}</span>
          <ChevronDown
            size={16}
            className="mh-cat-chevron"
            style={{ transform: open ? "rotate(180deg)" : "none" }}
          />
        </span>
      </button>
      <div className="mh-catbody-wrap">
        <div className="mh-catbody">
          <p>{data.rationale}</p>
        </div>
      </div>
    </div>
  );
}

function Radar({ scores, size = 260 }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame;
    let start;
    const duration = 750;

    const step = (timestamp) => {
      start ??= timestamp;
      const pct = Math.min((timestamp - start) / duration, 1);
      setProgress(1 - Math.pow(1 - pct, 3));
      if (pct < 1) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    const fallback = setTimeout(() => setProgress(1), 900);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(fallback);
    };
  }, []);

  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 48;
  const axes = CAT_ORDER.map((key, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / CAT_ORDER.length;
    return { key, angle, x: Math.cos(angle), y: Math.sin(angle) };
  });
  const point = (fraction, axis) => [
    cx + axis.x * radius * fraction,
    cy + axis.y * radius * fraction,
  ];
  const polygon = axes
    .map((axis) => {
      const value = scores?.[axis.key]?.score ?? 0;
      return point((value / 100) * progress, axis).join(",");
    })
    .join(" ");

  return (
    <svg
      width={size}
      height={size}
      viewBox={`-28 -14 ${size + 56} ${size + 28}`}
      aria-hidden="true"
      className="mh-radar-svg"
    >
      <defs>
        <linearGradient id="mh-radar-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--chart-3)" stopOpacity="0.22" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((fraction) => (
        <polygon
          key={fraction}
          points={axes.map((axis) => point(fraction, axis).join(",")).join(" ")}
          fill="none"
          stroke="var(--border)"
          strokeWidth="1"
        />
      ))}
      {axes.map((axis) => {
        const [x, y] = point(1, axis);
        return (
          <line
            key={axis.key}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke="var(--border)"
            strokeWidth="1"
          />
        );
      })}
      <polygon
        points={polygon}
        fill="url(#mh-radar-fill)"
        stroke="var(--chart-1)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {axes.map((axis) => {
        const value = scores?.[axis.key]?.score ?? 0;
        const [x, y] = point((value / 100) * progress, axis);
        return (
          <circle
            key={axis.key}
            cx={x}
            cy={y}
            r="3.5"
            fill="var(--chart-1)"
            stroke="#fff"
            strokeWidth="1.5"
          />
        );
      })}
      {axes.map((axis) => {
        const [x, y] = point(1.24, axis);
        return (
          <text
            key={axis.key}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="11"
            fontWeight="600"
            fill="var(--muted-foreground)"
          >
            {CAT_META[axis.key].short}
          </text>
        );
      })}
    </svg>
  );
}

function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function avatarColor(name = "") {
  const colors = ["#b8a2f2", "#8577ff", "#6b69ff", "#a392ff"];
  const sum = [...name].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[sum % colors.length];
}
