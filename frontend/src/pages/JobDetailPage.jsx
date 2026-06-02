import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  BarChart3,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  GitCompare,
  ListChecks,
  Loader2,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { ScoreBar, ScorePill } from "@/components/ScoreBar";
import { StatusBadge } from "@/components/StatusBadge";
import { BatchProgress } from "@/components/BatchProgress";
import { UploadZone } from "@/components/UploadZone";
import { CompareView } from "@/components/CompareView";
import { WeightsEditor } from "@/components/WeightsEditor";
import { useDebounce } from "@/hooks/useDebounce";
import {
  useBatchStatus,
  useDeleteCandidateForJob,
  useJob,
  useLeaderboard,
  useRescoreForJob,
} from "@/lib/queries";
import { jobsApi } from "@/lib/api";

const CATEGORIES = ["skills", "experience", "education", "domain_fit"];
const CAT_LABEL = { skills: "Skills", experience: "Exp.", education: "Edu.", domain_fit: "Domain" };
const PAGE_SIZE = 20;

export default function JobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const jobId = Number(id);

  const { data: job, isLoading: jobLoading } = useJob(jobId, {
    refetchInterval: (query) => {
      const currentJob = query?.state?.data;
      return currentJob?.extraction_status === "pending" ||
        currentJob?.extraction_status === "extracting"
        ? 1500
        : false;
    },
  });
  const { data: statusData } = useBatchStatus(jobId, { refetchInterval: 3000 });

  const [compareIds, setCompareIds] = useState([]);
  const [showCompare, setShowCompare] = useState(false);
  const [showAboutRole, setShowAboutRole] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [sort, setSort] = useState({ key: "overall_score", dir: "desc" });
  const [offset, setOffset] = useState(0);
  const [rescoringId, setRescoringId] = useState(null);
  const [rescoringAll, setRescoringAll] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [candidateToDelete, setCandidateToDelete] = useState(null);
  const { mutateAsync: rescoreCandidate } = useRescoreForJob(jobId);
  const { mutateAsync: deleteCandidate } = useDeleteCandidateForJob(jobId);

  const leaderboardParams = {
    search: debouncedQuery.trim() || undefined,
    offset,
    limit: PAGE_SIZE,
    sort_dir: sort.dir,
  };
  const hasActive = statusData ? statusData.pending + statusData.processing > 0 : false;
  const { data: leaderboard, isLoading: lbLoading } = useLeaderboard(
    jobId,
    leaderboardParams,
    {
      refetchInterval: (queryState) => {
        const rows = queryState?.state?.data?.items ?? [];
        const leaderboardHasActive = rows.some(
          (entry) => entry.status === "pending" || entry.status === "processing"
        );
        return hasActive || leaderboardHasActive ? 2000 : false;
      },
    }
  );

  const leaderboardRows = leaderboard?.items ?? [];
  const leaderboardTotal = leaderboard?.total ?? 0;
  const pageStart = leaderboardTotal === 0 ? 0 : offset + 1;
  const pageEnd = Math.min(offset + PAGE_SIZE, leaderboardTotal);
  const canPageBack = offset > 0;
  const canPageForward = offset + PAGE_SIZE < leaderboardTotal;

  useEffect(() => {
    setOffset(0);
  }, [debouncedQuery]);

  useEffect(() => {
    if (leaderboardTotal > 0 && offset >= leaderboardTotal) {
      const lastPageOffset = Math.floor((leaderboardTotal - 1) / PAGE_SIZE) * PAGE_SIZE;
      setOffset(lastPageOffset);
    }
  }, [leaderboardTotal, offset]);

  if (jobLoading) {
    return (
      <div className="flex items-center justify-center py-24 gap-2 text-(--muted-foreground)">
        <span className="mh-spinner" />
        <span className="text-sm">Loading job…</span>
      </div>
    );
  }

  if (!job) return <p className="text-sm text-(--muted-foreground)">Job not found.</p>;

  const mustHave = job.requirements?.filter((r) => r.kind === "must_have") ?? [];
  const niceToHave = job.requirements?.filter((r) => r.kind === "nice_to_have") ?? [];
  const screenedCount = statusData?.done ?? 0;

  const toggleCompare = (candidateId) => {
    setCompareIds((prev) =>
      prev.includes(candidateId)
        ? prev.filter((item) => item !== candidateId)
        : prev.length < 4
        ? [...prev, candidateId]
        : prev
    );
  };

  const handleSort = (key) => {
    setOffset(0);
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" }
    );
  };

  const handleRetry = async (event, candidateId) => {
    event.stopPropagation();
    setRescoringId(candidateId);
    try {
      await rescoreCandidate(candidateId);
      toast.success("Rescore queued.");
    } catch {
      toast.error("Rescore failed.");
    } finally {
      setRescoringId(null);
    }
  };

  const handleRescoreAll = async () => {
    setRescoringAll(true);
    try {
      const result = await jobsApi.getLeaderboard(jobId, {
        search: debouncedQuery.trim() || undefined,
        offset: 0,
        limit: 1000,
        sort_dir: sort.dir,
      });
      const candidates = (result.items ?? []).filter(
        (entry) => entry.status === "done" || entry.status === "error"
      );
      if (!candidates.length) return;

      const results = await Promise.allSettled(
        candidates.map((candidate) => rescoreCandidate(candidate.id))
      );
      const failed = results.filter((result) => result.status === "rejected").length;
      if (failed) {
        toast.error(`${failed} candidate${failed !== 1 ? "s" : ""} failed to rescore.`);
      } else {
        toast.success(`${candidates.length} candidate${candidates.length !== 1 ? "s" : ""} queued.`);
      }
    } finally {
      setRescoringAll(false);
    }
  };

  const handleDeleteClick = (event, candidate) => {
    event.stopPropagation();
    setCandidateToDelete(candidate);
  };

  const handleCancelDelete = () => {
    if (!deletingId) setCandidateToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!candidateToDelete) return;

    setDeletingId(candidateToDelete.id);
    try {
      await deleteCandidate(candidateToDelete.id);
      setCompareIds((current) => current.filter((item) => item !== candidateToDelete.id));
      setCandidateToDelete(null);
      toast.success("CV deleted.");
    } catch {
      toast.error("Failed to delete CV.");
    } finally {
      setDeletingId(null);
    }
  };

  const SortIcon = ({ k }) => {
    if (sort.key !== k) return null;
    return sort.dir === "desc" ? <ChevronDown size={12} /> : <ChevronUp size={12} />;
  };

  return (
    <div className="mh-page mh-job-detail-page">
      <div className="mh-job-hero">
        <div>
          <div className="mh-title-action-row">
            <h1 className="mh-job-title-main">{job.title}</h1>
            <Button variant="outline" size="sm" onClick={() => setShowAboutRole(true)}>
              <FileText size={14} />
              About this role
            </Button>
          </div>
          <p className="mh-page-sub">
            {mustHave.length + niceToHave.length} requirements extracted ·{" "}
            {screenedCount} candidate{screenedCount !== 1 ? "s" : ""} screened
          </p>
          {job.extraction_status === "extracting" && (
            <span className="mh-inline-processing">
              <span className="mh-spinner mh-spinner-xs" />
              Extracting requirements…
            </span>
          )}
        </div>
      </div>

      <div className="mh-job-detail-grid">
        <aside className="mh-stack mh-job-sidebar">
          <div className="mh-sidebar-upload-row">
            <UploadZone jobId={jobId} compact />
          </div>

          {(mustHave.length > 0 || niceToHave.length > 0) && (
            <Card>
              <SectionButton
                icon={<ListChecks size={15} />}
                title="Requirements"
                right={<Badge variant="muted">{mustHave.length + niceToHave.length}</Badge>}
              />
              <div className="mh-static-card-body">
                <div className="mh-requirements-scroll">
                  {mustHave.length > 0 && (
                    <RequirementGroup title="Must-have" requirements={mustHave} variant="default" />
                  )}
                  {niceToHave.length > 0 && (
                    <RequirementGroup title="Nice-to-have" requirements={niceToHave} variant="muted" />
                  )}
                </div>
              </div>
            </Card>
          )}

          <Card>
            <SectionButton
              icon={<SlidersHorizontal size={15} />}
              title="Scoring weights"
            />
            <div className="mh-static-card-body">
              <WeightsEditor jobId={jobId} currentWeights={job.category_weights} />
            </div>
          </Card>
        </aside>

        <section className="mh-leaderboard-panel">
          <div className="mh-tabletop">
            <div className="mh-tabletop-primary">
              <div className="mh-search mh-candidate-search">
                <Search size={16} className="mh-input-icon" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search candidates..."
                  aria-label="Search candidates"
                />
              </div>
            </div>
            <div className="mh-row">
              {compareIds.length >= 2 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCompareIds([]);
                    setShowCompare(false);
                  }}
                >
                  Clear compare ({compareIds.length})
                </Button>
              )}
              {compareIds.length >= 2 && (
                <Button size="sm" onClick={() => setShowCompare(true)}>
                  <GitCompare size={14} />
                  Compare {compareIds.length}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRescoreAll}
                loading={rescoringAll}
                disabled={rescoringAll || leaderboardTotal === 0}
              >
                {!rescoringAll && <RefreshCw size={14} />}
                Rescore all
              </Button>
              <a href={jobsApi.exportCsv(jobId)} download>
                <Button variant="outline" size="sm">
                  <Download size={14} />
                  Export CSV
                </Button>
              </a>
            </div>
          </div>

          <BatchProgress jobId={jobId} />

          {lbLoading ? (
            <div className="mh-table-empty">
              <span className="mh-spinner" />
              <span>Loading candidates…</span>
            </div>
          ) : leaderboardRows.length === 0 ? (
            <div className="mh-table-empty">
              <p>No candidates match this view.</p>
              <span>Upload CVs or adjust the search term.</span>
            </div>
          ) : (
            <div className="mh-table-wrap mh-leaderboard-table-wrap">
              <table className="mh-table mh-leaderboard-table">
                <colgroup>
                  <col className="mh-col-select" />
                  <col className="mh-col-rank" />
                  <col className="mh-col-candidate" />
                  <col className="mh-col-score" />
                  <col className="mh-col-category" />
                  <col className="mh-col-category" />
                  <col className="mh-col-category" />
                  <col className="mh-col-category" />
                  <col className="mh-col-status" />
                  <col className="mh-col-action" />
                </colgroup>
                <thead>
                  <tr>
                    <th className="mh-select-col"></th>
                    <th>#</th>
                    <th>Candidate</th>
                    <th
                      className="cursor-pointer select-none"
                      onClick={() => handleSort("overall_score")}
                    >
                      <span className="flex items-center gap-1">
                        Score <SortIcon k="overall_score" />
                      </span>
                    </th>
                    {CATEGORIES.map((category) => (
                      <th key={category} className="center">
                        {CAT_LABEL[category]}
                      </th>
                    ))}
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboardRows.map((entry) => {
                    const isInCompare = compareIds.includes(entry.id);
                    const isDone = entry.status === "done";
                    const isError = entry.status === "error";

                    return (
                      <tr
                        key={entry.id}
                        className={isInCompare ? "is-selected" : ""}
                        onClick={() => {
                          if (isDone || isError) {
                            navigate(`/candidates/${entry.id}`, {
                              state: { from: `/jobs/${jobId}` },
                            });
                          }
                        }}
                      >
                        <td onClick={(event) => event.stopPropagation()}>
                          {isDone && (
                            <button
                              type="button"
                              role="checkbox"
                              aria-checked={isInCompare}
                              onClick={() => toggleCompare(entry.id)}
                              className={`mh-check ${isInCompare ? "is-checked" : ""}`}
                              style={{ width: 22, height: 22 }}
                              title="Add to compare"
                            >
                              <svg viewBox="0 0 24 24" width={13} height={13} aria-hidden="true">
                                <path
                                  d="M5 12.5l4.2 4.3L19 7"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="mh-check-path"
                                />
                              </svg>
                            </button>
                          )}
                        </td>
                        <td>
                          <span className="mh-rank">{isDone ? entry.rank : "–"}</span>
                        </td>
                        <td>
                          <div className="mh-candidate-cell">
                            <span className="mh-cand-avatar" style={{ background: avatarColor(entry.name) }}>
                              {initials(entry.name)}
                            </span>
                            <div className="min-w-0">
                              <p className="mh-cand-name">{entry.name}</p>
                              <p className="mh-cand-file">{entry.original_filename}</p>
                              {isError && entry.error && (
                                <p className="mh-error-line" title={entry.error}>
                                  {entry.error}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          {isDone && entry.overall_score != null ? (
                            <div className="mh-score-cell">
                              <span className="mh-score-number mono">{entry.overall_score.toFixed(1)}</span>
                              <div className="mh-scorebar-cell">
                                <ScoreBar score={entry.overall_score} height={5} showLabel={false} />
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-(--subtle-foreground)">–</span>
                          )}
                        </td>
                        {CATEGORIES.map((category) => (
                          <td key={category} className="center">
                            {isDone && entry.category_scores?.[category] ? (
                              <ScorePill score={entry.category_scores[category].score} />
                            ) : (
                              <span className="text-xs text-(--subtle-foreground)">–</span>
                            )}
                          </td>
                        ))}
                        <td>
                          <StatusBadge status={entry.status} />
                        </td>
                        <td onClick={(event) => event.stopPropagation()}>
                          <div className="mh-row-actions">
                            {isError && (
                              <button
                                className="mh-icon-btn"
                                disabled={rescoringId === entry.id}
                                onClick={(event) => handleRetry(event, entry.id)}
                                title={entry.error ?? "Retry scoring"}
                                aria-label={`Retry scoring ${entry.name}`}
                              >
                                <RefreshCw
                                  size={14}
                                  className={rescoringId === entry.id ? "animate-spin" : ""}
                                />
                              </button>
                            )}
                            <button
                              className="mh-icon-btn mh-delete-btn"
                              disabled={deletingId === entry.id}
                              onClick={(event) => handleDeleteClick(event, entry)}
                              title="Delete CV"
                              aria-label={`Delete ${entry.name}`}
                            >
                              {deletingId === entry.id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Trash2 size={14} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!lbLoading && leaderboardTotal > 0 && (
            <div className="mh-row justify-between px-1 pt-1">
              <span className="text-xs text-(--muted-foreground)">
                Showing {pageStart}-{pageEnd} of {leaderboardTotal}
              </span>
              <div className="mh-row">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canPageBack}
                  onClick={() => setOffset((current) => Math.max(0, current - PAGE_SIZE))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canPageForward}
                  onClick={() => setOffset((current) => current + PAGE_SIZE)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>

      {showCompare && compareIds.length >= 2 && (
        <CompareView
          candidateIds={compareIds}
          requirements={job.requirements ?? []}
          onClose={() => setShowCompare(false)}
        />
      )}

      <Dialog
        open={showAboutRole}
        onClose={() => setShowAboutRole(false)}
        title="About this role"
        size="lg"
      >
        <div className="flex flex-col gap-3">
          <h3 className="text-base font-semibold text-(--foreground)">{job.title}</h3>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-(--muted-foreground)">
            {job.description}
          </p>
        </div>
      </Dialog>

      <Dialog open={!!candidateToDelete} onClose={handleCancelDelete} title="Delete CV" size="sm">
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-(--muted-foreground)">
            Delete{" "}
            <span className="font-semibold text-(--foreground)">
              {candidateToDelete?.name}
            </span>{" "}
            from this job? This will remove the CV and its evaluation from the leaderboard.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleCancelDelete} disabled={!!deletingId}>
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={handleConfirmDelete} loading={!!deletingId}>
              <Trash2 size={14} />
              Delete CV
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function SectionButton({ icon, title, right, className = "" }) {
  return (
    <div className={`mh-sec-head ${className}`}>
      <span className="mh-sec-title">
        {icon}
        {title}
      </span>
      {right}
    </div>
  );
}

function RequirementGroup({ title, requirements, variant }) {
  return (
    <div className="mh-req-group">
      <p className="mh-reqgroup-label">{title}</p>
      <div className="mh-chips mh-requirement-chips">
        {requirements.map((requirement) => (
          <Badge key={requirement.id} variant={variant} className="mh-req-chip">
            {requirement.text}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function avatarColor(name = "") {
  const colors = ["#b8a2f2", "#8577ff", "#6b69ff", "#a392ff", "#3653dc"];
  const sum = [...name].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[sum % colors.length];
}
