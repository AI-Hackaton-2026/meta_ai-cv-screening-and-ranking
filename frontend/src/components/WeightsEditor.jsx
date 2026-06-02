import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { useUpdateJob } from "@/lib/queries";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { key: "skills", label: "Skills" },
  { key: "experience", label: "Experience" },
  { key: "education", label: "Education" },
  { key: "domain_fit", label: "Domain Fit" },
];

const DEFAULT_WEIGHTS = { skills: 35, experience: 30, education: 20, domain_fit: 15 };

export function WeightsEditor({ jobId, currentWeights }) {
  const weights = currentWeights ?? DEFAULT_WEIGHTS;
  const [local, setLocal] = useState(weights);
  const { mutateAsync: updateJob, isPending } = useUpdateJob(jobId);

  const total = Object.values(local).reduce((a, b) => a + Number(b), 0);
  const valid = total === 100;

  const handleChange = (key, value) => {
    setLocal((prev) => ({ ...prev, [key]: Number(value) }));
  };

  const handleSave = async () => {
    if (!valid) return;
    try {
      await updateJob({ category_weights: local });
      toast.success("Weights saved. Re-score candidates to apply.");
    } catch {
      toast.error("Failed to save weights.");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        {CATEGORIES.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-2">
            <label className="text-xs text-[var(--color-ink-muted)] w-24 shrink-0">{label}</label>
            <div className="flex items-center gap-1 flex-1">
              <input
                type="range"
                min={0}
                max={100}
                value={local[key] ?? 0}
                onChange={(e) => handleChange(key, e.target.value)}
                className="flex-1 accent-[var(--color-primary)]"
              />
              <span className={cn("text-xs font-medium tabular-nums w-8 text-right",
                valid ? "text-[var(--color-ink)]" : "text-amber-600"
              )}>
                {local[key]}%
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <span className={cn("text-xs font-medium", valid ? "text-[var(--color-ink-muted)]" : "text-amber-600")}>
          Total: {total}% {!valid && "(must equal 100%)"}
        </span>
        <Button size="sm" onClick={handleSave} disabled={!valid} loading={isPending}>
          Save Weights
        </Button>
      </div>
    </div>
  );
}
