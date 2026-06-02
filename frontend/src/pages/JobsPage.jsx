import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Briefcase, Users, Loader2, FlaskConical, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CreateJobDialog } from "@/components/CreateJobDialog";
import { useJobs, useSeed } from "@/lib/queries";

const EXTRACTION_STATUS_BADGE = {
  pending: { label: "Setting up", variant: "muted" },
  extracting: { label: "Extracting requirements…", variant: "processing" },
  done: { label: "Ready", variant: "default" },
  error: { label: "Error", variant: "muted" },
};

export default function JobsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const { data: jobs, isLoading } = useJobs();
  const { mutateAsync: seed, isPending: seeding } = useSeed();

  const handleSeed = async () => {
    try {
      await seed();
      toast.success("Sample data loading in background…");
    } catch {
      toast.error("Seed failed. Is the backend running?");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-ink)]">Job Openings</h1>
          <p className="text-sm text-[var(--color-ink-muted)] mt-0.5">
            Create a job, upload CVs, and let AI rank your candidates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSeed} loading={seeding}>
            <FlaskConical size={14} /> Load Sample Data
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New Job
          </Button>
        </div>
      </div>

      {/* Job grid */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-[var(--color-ink-muted)] py-12 justify-center">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm">Loading jobs…</span>
        </div>
      ) : jobs?.length === 0 ? (
        <EmptyState onNew={() => setShowCreate(true)} onSeed={handleSeed} seeding={seeding} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs?.map((job) => (
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
      <Card clickable className="h-full flex flex-col gap-3">
        {/* Title + status */}
        <div className="flex items-start justify-between gap-2">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-[var(--radius-md)] shrink-0"
            style={{ background: "var(--color-primary-light)" }}
          >
            <Briefcase size={16} style={{ color: "var(--color-primary)" }} />
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>

        <div className="flex-1">
          <h2 className="text-sm font-semibold text-[var(--color-ink)] group-hover:text-[var(--color-primary)] transition-colors line-clamp-2">
            {job.title}
          </h2>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]">
          <div className="flex items-center gap-1 text-xs text-[var(--color-ink-muted)]">
            <Users size={12} />
            <span>
              {job.candidate_count} candidate{job.candidate_count !== 1 ? "s" : ""}
            </span>
          </div>
          <span className="text-xs text-[var(--color-primary)] font-medium flex items-center gap-0.5">
            Open <ChevronRight size={12} />
          </span>
        </div>
      </Card>
    </Link>
  );
}

function EmptyState({ onNew, onSeed, seeding }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
      <div
        className="flex items-center justify-center w-16 h-16 rounded-[var(--radius-xl)]"
        style={{ background: "var(--color-primary-light)" }}
      >
        <Briefcase size={28} style={{ color: "var(--color-primary)" }} />
      </div>
      <div>
        <p className="text-base font-semibold text-[var(--color-ink)]">No jobs yet</p>
        <p className="text-sm text-[var(--color-ink-muted)] mt-1">
          Create your first job opening or load sample data to explore.
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onSeed} loading={seeding}>
          <FlaskConical size={14} /> Load Sample Data
        </Button>
        <Button onClick={onNew}>
          <Plus size={14} /> Create Job
        </Button>
      </div>
    </div>
  );
}
