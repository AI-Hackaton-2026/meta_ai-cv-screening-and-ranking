import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { useCreateJob } from "@/lib/queries";

export function CreateJobDialog({ open, onClose }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const { mutateAsync: createJob, isPending } = useCreateJob();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
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

  return (
    <Dialog open={open} onClose={onClose} title="Create New Job" size="md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Job Title"
          placeholder="e.g. Senior Full-Stack Engineer"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <Textarea
          label="Job Description"
          placeholder="Paste the full job description here — Claude will extract requirements automatically."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-[160px]"
          required
        />
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isPending} disabled={!title || !description}>
            Create Job
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
