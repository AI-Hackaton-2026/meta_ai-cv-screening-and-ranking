import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Users, ArrowUpRight, Search } from "lucide-react";
import { FunnelIcon, CvCheckIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CreateJobDialog } from "@/components/CreateJobDialog";
import { useDebounce } from "@/hooks/useDebounce";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { useInfiniteJobs } from "@/lib/queries";

const JOBS_PAGE_SIZE = 12;

const EXTRACTION_STATUS_BADGE = {
  pending: { label: "Setting up", variant: "muted" },
  extracting: { label: "Extracting requirements…", variant: "processing" },
  done: { label: "Ready", variant: "muted" },
  error: { label: "Error", variant: "muted" },
};

export default function JobsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteJobs({
    search: debouncedQuery.trim() || undefined,
    limit: JOBS_PAGE_SIZE,
  });
  const jobs = data?.pages.flatMap((page) => page.items) ?? [];
  const loadMoreRef = useInfiniteScroll({
    enabled: Boolean(hasNextPage),
    isLoading: isFetchingNextPage,
    onLoadMore: fetchNextPage,
  });

  return (
    <div className="mh-page">
      <div className="mh-pagehead">
        <div>
          <h1 className="mh-page-title">Job openings</h1>
          <p className="mh-page-sub">
            Create a job, upload CVs, and let AI rank your candidates.
          </p>
        </div>
        <div className="mh-row mh-jobs-actions">
          <div className="mh-search mh-jobs-search">
            <Search size={16} className="mh-input-icon" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search jobs by title..."
              aria-label="Search jobs"
            />
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New job
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-[var(--muted-foreground)] py-12 justify-center">
          <span className="mh-spinner" />
          <span className="text-sm">Loading jobs…</span>
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState
          query={query}
          onNew={() => setShowCreate(true)}
        />
      ) : (
        <>
          <div className="mh-jobgrid">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
          <div ref={loadMoreRef} className="mh-jobs-sentinel">
            {isFetchingNextPage && (
              <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                <span className="mh-spinner" />
                <span className="text-sm">Loading more jobs…</span>
              </div>
            )}
          </div>
        </>
      )}

      <CreateJobDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}

function JobCard({ job }) {
  const status = EXTRACTION_STATUS_BADGE[job.extraction_status] ?? EXTRACTION_STATUS_BADGE.pending;
  const jobNumber = getJobNumber(job);

  return (
    <Link to={`/jobs/${job.id}`} className="block group">
      <Card clickable className="mh-job-card">
        <span className="mh-job-accent" />
        <div className="mh-job-top">
          <span className="mh-job-eyebrow">{jobNumber}</span>
          <span className="mh-job-ready">
            {job.extraction_status === "extracting" && (
              <span className="mh-spinner mh-spinner-xs" />
            )}
            {status.label}
          </span>
        </div>

        <h2 className="mh-job-title group-hover:text-[var(--primary)]">{job.title}</h2>
        <p className="mh-job-desc">{job.description}</p>

        <div className="mh-job-foot">
          <span className="mh-meta">
            <Users size={13} style={{ color: "#534ab7" }} />
            {job.candidate_count} candidate{job.candidate_count !== 1 ? "s" : ""}
          </span>
          <span className="mh-job-open" aria-hidden="true">
            <ArrowUpRight size={17} />
          </span>
        </div>
      </Card>
    </Link>
  );
}

function getJobNumber(job) {
  const demoNumber = job.title.match(/demo job\s+(\d+)/i)?.[1];
  const number = demoNumber ?? String(job.id).padStart(3, "0");
  return `Job ${number}`;
}

function EmptyState({ query, onNew }) {
  const hasQuery = query.trim().length > 0;

  return (
    <div className="mh-empty">
      <div className="mh-empty-icon">
        {hasQuery ? <CvCheckIcon size={30} /> : <FunnelIcon size={30} />}
      </div>
      <div>
        <p className="text-[15px] font-semibold text-[var(--foreground)]">
          {hasQuery ? `No jobs match "${query}"` : "No jobs yet"}
        </p>
        <p className="mh-page-sub">
          {hasQuery
            ? "Try a different search, or create a new job opening."
            : "Create your first job opening to start screening candidates."}
        </p>
      </div>
      {!hasQuery && (
        <div className="mh-row">
          <Button onClick={onNew}>
            <Plus size={14} /> New job
          </Button>
        </div>
      )}
    </div>
  );
}
