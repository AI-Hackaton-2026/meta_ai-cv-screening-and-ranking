import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Download,
  GitCompare,
  SlidersHorizontal,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ScoreBar, ScorePill } from "@/components/ScoreBar";
import { StatusBadge } from "@/components/StatusBadge";
import { BatchProgress } from "@/components/BatchProgress";
import { UploadZone } from "@/components/UploadZone";
import { CandidateDrawer } from "@/components/CandidateDrawer";
import { CompareView } from "@/components/CompareView";
import { WeightsEditor } from "@/components/WeightsEditor";
import { useJob, useLeaderboard, useBatchStatus } from "@/lib/queries";
import { jobsApi } from "@/lib/api";
import { recommendationClass, recommendationLabel } from "@/lib/utils";

const CATEGORIES = ["skills", "experience", "education", "domain_fit"];
const CAT_LABEL = { skills: "Skills", experience: "Exp.", education: "Edu.", domain_fit: "Domain" };

export default function JobDetailPage() {
  const { id } = useParams();
  const jobId = Number(id);

  const { data: job, isLoading: jobLoading } = useJob(jobId);
  const { data: statusData } = useBatchStatus(jobId, { refetchInterval: 3000 });

  // Poll leaderboard while any candidates are active
  const hasActive = statusData ? statusData.pending + statusData.processing > 0 : false;
  const { data: leaderboard, isLoading: lbLoading } = useLeaderboard(jobId, {
    refetchInterval: hasActive ? 2000 : false,
  });

  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [compareIds, setCompareIds] = useState([]);
  const [showWeights, setShowWeights] = useState(false);
  const [showUpload, setShowUpload] = useState(true);
  const [sort, setSort] = useState({ key: "overall_score", dir: "desc" });

  // Auto-collapse upload once candidates exist
  useEffect(() => {
    if (leaderboard?.length > 0) setShowUpload(false);
  }, [leaderboard?.length]);

  if (jobLoading) {
    return (
      <div className="flex items-center justify-center py-24 gap-2 text-[var(--color-ink-muted)]">
        <Loader2 size={20} className="animate-spin" />
        <span className="text-sm">Loading job…</span>
      </div>
    );
  }

  if (!job) return <p className="text-sm text-[var(--color-ink-muted)]">Job not found.</p>;

  const mustHave = job.requirements?.filter((r) => r.kind === "must_have") ?? [];
  const niceToHave = job.requirements?.filter((r) => r.kind === "nice_to_have") ?? [];

  const toggleCompare = (candidateId) => {
    setCompareIds((prev) =>
      prev.includes(candidateId)
        ? prev.filter((id) => id !== candidateId)
        : prev.length < 4
        ? [...prev, candidateId]
        : prev
    );
  };

  const sortedLeaderboard = [...(leaderboard ?? [])].sort((a, b) => {
    const valA = a[sort.key] ?? -1;
    const valB = b[sort.key] ?? -1;
    return sort.dir === "desc" ? valB - valA : valA - valB;
  });

  const handleSort = (key) => {
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" }
    );
  };

  const SortIcon = ({ k }) => {
    if (sort.key !== k) return null;
    return sort.dir === "desc" ? <ChevronDown size={12} /> : <ChevronUp size={12} />;
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link to="/" className="flex items-center gap-1 text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-primary)] transition-colors">
          <ArrowLeft size={14} />
          Jobs
        </Link>
        <span className="text-[var(--color-border)]">/</span>
        <span className="text-sm text-[var(--color-ink)] font-medium truncate">{job.title}</span>
      </div>

      {/* Job header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-[var(--color-ink)]">{job.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            {job.extraction_status === "extracting" && (
              <span className="flex items-center gap-1 text-xs text-[var(--color-primary)]">
                <Loader2 size={12} className="animate-spin" />
                Extracting requirements…
              </span>
            )}
            {job.extraction_status === "done" && (
              <span className="text-xs text-[var(--color-ink-muted)]">
                {mustHave.length + niceToHave.length} requirements extracted
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {compareIds.length >= 2 && (
            <Button variant="outline" size="sm" onClick={() => setCompareIds([])}>
              Clear compare ({compareIds.length})
            </Button>
          )}
          {compareIds.length >= 2 && (
            <Button size="sm" onClick={() => {}}>
              <GitCompare size={14} />
              Compare {compareIds.length}
            </Button>
          )}
          <a href={jobsApi.exportCsv(jobId)} download>
            <Button variant="outline" size="sm">
              <Download size={14} />
              Export CSV
            </Button>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left panel: job info, requirements, upload, weights */}
        <div className="flex flex-col gap-4">
          {/* Requirements */}
          {(mustHave.length > 0 || niceToHave.length > 0) && (
            <Card>
              <h3 className="text-xs font-semibold text-[var(--color-ink-muted)] uppercase tracking-wide mb-3">
                Requirements
              </h3>
              {mustHave.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs font-medium text-[var(--color-ink)] mb-1.5">Must-have</p>
                  <div className="flex flex-wrap gap-1.5">
                    {mustHave.map((r) => (
                      <Badge key={r.id} variant="default">{r.text}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {niceToHave.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-[var(--color-ink-muted)] mb-1.5 mt-2">Nice-to-have</p>
                  <div className="flex flex-wrap gap-1.5">
                    {niceToHave.map((r) => (
                      <Badge key={r.id} variant="muted">{r.text}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Upload zone */}
          <Card>
            <button
              className="flex items-center justify-between w-full text-xs font-semibold text-[var(--color-ink-muted)] uppercase tracking-wide mb-3"
              onClick={() => setShowUpload((v) => !v)}
            >
              Upload CVs
              {showUpload ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showUpload && <UploadZone jobId={jobId} />}
          </Card>

          {/* Scoring weights */}
          <Card>
            <button
              className="flex items-center justify-between w-full text-xs font-semibold text-[var(--color-ink-muted)] uppercase tracking-wide mb-3"
              onClick={() => setShowWeights((v) => !v)}
            >
              <span className="flex items-center gap-1.5">
                <SlidersHorizontal size={12} />
                Scoring Weights
              </span>
              {showWeights ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showWeights && (
              <WeightsEditor jobId={jobId} currentWeights={job.category_weights} />
            )}
          </Card>
        </div>

        {/* Right panel: leaderboard */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <BatchProgress jobId={jobId} />

          {lbLoading ? (
            <div className="flex items-center gap-2 py-12 justify-center text-[var(--color-ink-muted)]">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Loading candidates…</span>
            </div>
          ) : sortedLeaderboard.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
              <p className="text-sm font-medium text-[var(--color-ink)]">No candidates yet</p>
              <p className="text-xs text-[var(--color-ink-muted)]">
                Upload CVs to start screening
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)]">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr
                    className="text-xs text-[var(--color-ink-muted)] font-medium"
                    style={{ background: "var(--color-canvas)", borderBottom: "1px solid var(--color-border)" }}
                  >
                    <th className="px-3 py-3 text-left w-8">#</th>
                    <th className="px-3 py-3 text-left">Candidate</th>
                    <th
                      className="px-3 py-3 text-left cursor-pointer hover:text-[var(--color-primary)] transition-colors select-none"
                      onClick={() => handleSort("overall_score")}
                    >
                      <span className="flex items-center gap-1">
                        Score <SortIcon k="overall_score" />
                      </span>
                    </th>
                    {CATEGORIES.map((c) => (
                      <th key={c} className="px-2 py-3 text-center hidden lg:table-cell text-[10px] uppercase">
                        {CAT_LABEL[c]}
                      </th>
                    ))}
                    <th className="px-3 py-3 text-left">Status</th>
                    <th className="px-3 py-3 text-center w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedLeaderboard.map((entry, i) => {
                    const isInCompare = compareIds.includes(entry.id);
                    const isDone = entry.status === "done";

                    return (
                      <tr
                        key={entry.id}
                        className="border-t border-[var(--color-border)] hover:bg-[var(--color-primary-light)] transition-colors cursor-pointer"
                        style={isInCompare ? { background: "rgba(114,107,255,0.06)" } : {}}
                        onClick={() => isDone && setSelectedCandidate(entry.id)}
                      >
                        {/* Rank */}
                        <td className="px-3 py-3">
                          <span className="text-xs font-medium text-[var(--color-ink-muted)]">
                            {isDone ? entry.rank : "–"}
                          </span>
                        </td>

                        {/* Name */}
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            {isDone && (
                              <input
                                type="checkbox"
                                checked={isInCompare}
                                onChange={(e) => { e.stopPropagation(); toggleCompare(entry.id); }}
                                className="accent-[var(--color-primary)]"
                                title="Add to compare"
                              />
                            )}
                            <div>
                              <p className="font-medium text-[var(--color-ink)] text-xs leading-tight">
                                {entry.name}
                              </p>
                              <p className="text-[10px] text-[var(--color-ink-muted)] truncate max-w-[140px]">
                                {entry.original_filename}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Overall score */}
                        <td className="px-3 py-3 min-w-[100px]">
                          {isDone && entry.overall_score != null ? (
                            <div className="flex flex-col gap-1">
                              <ScoreBar score={entry.overall_score} height={4} />
                              {entry.recommendation && (
                                <span
                                  className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${recommendationClass(entry.recommendation)}`}
                                >
                                  {recommendationLabel(entry.recommendation)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-[var(--color-ink-subtle)]">–</span>
                          )}
                        </td>

                        {/* Category mini-scores */}
                        {CATEGORIES.map((c) => (
                          <td key={c} className="px-2 py-3 text-center hidden lg:table-cell">
                            {isDone && entry.category_scores?.[c] ? (
                              <ScorePill score={entry.category_scores[c].score} />
                            ) : (
                              <span className="text-xs text-[var(--color-ink-subtle)]">–</span>
                            )}
                          </td>
                        ))}

                        {/* Status */}
                        <td className="px-3 py-3">
                          <StatusBadge status={entry.status} />
                        </td>

                        {/* Action */}
                        <td className="px-3 py-3 text-center">
                          {isDone && (
                            <button
                              className="text-xs text-[var(--color-primary)] hover:underline"
                              onClick={(e) => { e.stopPropagation(); setSelectedCandidate(entry.id); }}
                            >
                              View
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Candidate detail drawer */}
      {selectedCandidate && (
        <CandidateDrawer
          candidateId={selectedCandidate}
          requirements={job.requirements ?? []}
          onClose={() => setSelectedCandidate(null)}
        />
      )}

      {/* Compare view */}
      {compareIds.length >= 2 && (
        <CompareView
          candidateIds={compareIds}
          onClose={() => setCompareIds([])}
        />
      )}
    </div>
  );
}
