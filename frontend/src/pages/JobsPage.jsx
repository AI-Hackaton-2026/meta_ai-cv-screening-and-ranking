import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Briefcase,
  Users,
  ChevronRight,
  Search,
  FileSearch,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CreateJobDialog } from "@/components/CreateJobDialog";
import { useDebounce } from "@/hooks/useDebounce";
import { useJobs } from "@/lib/queries";

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
  const { data: jobs, isLoading } = useJobs({
    search: debouncedQuery.trim() || undefined,
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
      ) : jobs?.length === 0 ? (
        <EmptyState
          query={query}
          onNew={() => setShowCreate(true)}
        />
      ) : (
        <div className="mh-jobgrid">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}

      <CreateJobDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}

function JobCard({ job }) {
  const status = EXTRACTION_STATUS_BADGE[job.extraction_status] ?? EXTRACTION_STATUS_BADGE.pending;

  return (
    <Link to={`/jobs/${job.id}`} className="block group">
      <Card clickable className="mh-job-card">
        <div className="flex items-start justify-between gap-2">
          <div className="mh-job-icon">
            <Briefcase size={17} />
          </div>
          <Badge variant={status.variant}>
            {job.extraction_status === "extracting" && (
              <span className="mh-spinner mh-spinner-xs" />
            )}
            {status.label}
          </Badge>
        </div>

        <h2 className="mh-job-title group-hover:text-[var(--primary)]">{job.title}</h2>

        <div className="mh-job-foot">
          <span className="mh-meta">
            <Users size={13} />
            {job.candidate_count} candidate{job.candidate_count !== 1 ? "s" : ""}
          </span>
          <span className="mh-open-link">
            Open <ChevronRight size={14} />
          </span>
        </div>
      </Card>
    </Link>
  );
}

function EmptyState({ query, onNew }) {
  const hasQuery = query.trim().length > 0;

  return (
    <div className="mh-empty">
      <div className="mh-empty-icon">
        {hasQuery ? <FileSearch size={26} /> : <Briefcase size={28} />}
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
