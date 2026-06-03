import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, FileText, Sparkles, Type, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { useCreateJob } from "@/lib/queries";

export function CreateJobDialog({ open, onClose }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const { mutateAsync: createJob, isPending } = useCreateJob();
  const isValid = title.trim().length > 0 && description.trim().length > 0;

  useEffect(() => {
    if (!open) return;

    const handleKey = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;
    try {
      const job = await createJob({ title: title.trim(), description: description.trim() });
      toast.success("Job created! Extracting requirements…");
      onClose();
      setTitle("");
      setDescription("");
      navigate(`/jobs/${job.id}`);
    } catch {
      toast.error("Failed to create job. Is the backend running?");
    }
  };

  if (!open) return null;

  return (
    <div
      className="mh-overlay"
      onClick={(event) => event.target === event.currentTarget && onClose?.()}
    >
      <div className="mh-modal" role="dialog" aria-modal="true" aria-labelledby="create-job-title">
        <button className="mh-icon-btn mh-modal-x" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <div className="mh-modal-head">
          <div className="mh-modal-head-icon">
            <Briefcase size={20} strokeWidth={2.1} />
          </div>
          <div>
            <h2 id="create-job-title" className="mh-modal-title">
              Create a new job
            </h2>
            <p className="mh-modal-subtitle">
              Claude will read the description and extract requirements automatically.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mh-modal-body">
          <Field
            label="Job title"
            icon={<Type size={14} strokeWidth={2.25} />}
            hint="Shown on the leaderboard"
            required
          >
            <input
              autoFocus
              className="mh-input"
              placeholder="e.g. Senior Full-Stack Engineer"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </Field>

          <Field
            label="Job description"
            icon={<FileText size={14} strokeWidth={2.25} />}
            hint={`${description.length} chars`}
            required
          >
            <textarea
              className="mh-textarea mh-job-desc-input"
              placeholder="Paste the full job description here — responsibilities, must-have skills, nice-to-haves, and any context about the team."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              required
            />
          </Field>

          <div className="mh-ai-hint">
            <Sparkles
              size={16}
              strokeWidth={2.1}
              className="mt-0.5 shrink-0 text-[var(--primary)]"
            />
            <p>
              On create, MetaHire extracts <strong>must-have</strong> and{" "}
              <strong>nice-to-have</strong> requirements and suggests scoring weights.
            </p>
          </div>

          <div className="mh-modal-foot">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={isPending} disabled={!isValid}>
              {!isPending && <Sparkles size={15} />}
              Create job
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, icon, hint, required, children }) {
  return (
    <div className="mh-field">
      <div className="mh-field-head">
        <label className="mh-field-label">
          <span className="text-(--primary)">{icon}</span>
          {label}
          {required && <span className="text-(--primary)">*</span>}
        </label>
        {hint && <span className="mh-field-hint">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
