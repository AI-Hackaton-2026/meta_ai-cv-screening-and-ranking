import { useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useUpdateJob } from "@/lib/queries";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { key: "skills", label: "Skills", color: "var(--chart-1)" },
  { key: "experience", label: "Experience", color: "var(--chart-2)" },
  { key: "education", label: "Education", color: "var(--chart-3)" },
  { key: "domain_fit", label: "Domain Fit", color: "var(--chart-4)" },
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
    <div className="mh-weights-editor">
      <div className="mh-weightbar">
        {CATEGORIES.map(({ key, color }) => (
          <div
            key={key}
            style={{ width: `${local[key] ?? 0}%`, background: color }}
          />
        ))}
      </div>

      <div className="mh-weight-legend">
        {CATEGORIES.map(({ key, label, color }) => (
          <span key={key}>
            <span style={{ background: color }} />
            {label}
            <strong>{local[key] ?? 0}%</strong>
          </span>
        ))}
      </div>

      <div className="mh-weight-controls">
        {CATEGORIES.map(({ key, label }) => (
          <div key={key} className="mh-weight-row">
            <label>{label}</label>
            <div className="mh-weight-input">
              <input
                type="range"
                min={0}
                max={100}
                value={local[key] ?? 0}
                onChange={(e) => handleChange(key, e.target.value)}
                className="mh-range"
              />
              <span className={cn("text-xs font-medium tabular-nums w-8 text-right",
                valid ? "text-[var(--foreground)]" : "text-amber-600"
              )}>
                {local[key]}%
              </span>
            </div>
          </div>
        ))}
      </div>

      <p className="mh-weight-help">
        Weights must add up to 100%. Adjust sliders, then save to apply the scoring split.
      </p>

      <div className="flex items-center justify-between gap-3">
        <span className={cn("text-xs font-medium", valid ? "text-[var(--color-ink-muted)]" : "text-amber-600")}>
          Total: {total}% {!valid && "(must equal 100%)"}
        </span>
        <div className="mh-row">
          <Button type="button" variant="ghost" size="sm" onClick={() => setLocal(weights)}>
            Reset
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!valid} loading={isPending}>
            {!isPending && <Check size={14} />}
            Save weights
          </Button>
        </div>
      </div>
    </div>
  );
}
