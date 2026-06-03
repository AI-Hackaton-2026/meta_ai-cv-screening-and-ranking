import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useUpdateJob } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { completeWeights, importancesToWeights, percentagesToImportances } from "@/lib/weights";

const CATEGORIES = [
  { key: "skills", label: "Skills", color: "var(--chart-1)" },
  { key: "experience", label: "Experience", color: "var(--chart-2)" },
  { key: "education", label: "Education", color: "var(--chart-3)" },
  { key: "domain_fit", label: "Domain Fit", color: "var(--chart-4)" },
];

export function WeightsEditor({ jobId, currentWeights }) {
  const weights = useMemo(() => completeWeights(currentWeights), [currentWeights]);
  const [importances, setImportances] = useState(() => percentagesToImportances(weights));
  const [hasChanges, setHasChanges] = useState(false);
  const { mutateAsync: updateJob, isPending } = useUpdateJob(jobId);

  const computedWeights = hasChanges ? importancesToWeights(importances) : weights;

  useEffect(() => {
    if (!hasChanges) {
      setImportances(percentagesToImportances(weights));
    }
  }, [hasChanges, weights]);

  const handleChange = (key, value) => {
    setImportances((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await updateJob({ category_weights: computedWeights });
      setHasChanges(false);
      toast.success("Weights saved.");
    } catch {
      toast.error("Failed to save weights.");
    }
  };

  return (
    <div className="mh-weights-editor">
      <div className="mh-weightbar">
        {CATEGORIES.map(({ key, color }) => (
          <div key={key} style={{ width: `${computedWeights[key] ?? 0}%`, background: color }} />
        ))}
      </div>

      <div className="mh-weight-controls">
        {CATEGORIES.map(({ key, label, color }) => (
          <div key={key} className="mh-weight-row">
            <label>{label}</label>
            <div className="mh-importance-picker">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  type="button"
                  aria-label={`${label} importance ${level}`}
                  className={cn(
                    "mh-importance-dot",
                    importances[key] >= level && "mh-importance-dot--active"
                  )}
                  style={importances[key] >= level ? { background: color } : undefined}
                  onClick={() => handleChange(key, level)}
                />
              ))}
              <span className="mh-importance-label">
                {IMPORTANCE_LABELS[importances[key]] ?? ""}
              </span>
            </div>
          </div>
        ))}
      </div>

      <p className="mh-weight-help">
        Rate how important each category is for this role. Percentages are calculated automatically.
      </p>

      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-[var(--color-ink-muted)]" />
        <div className="mh-row">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setImportances(percentagesToImportances(weights));
              setHasChanges(false);
            }}
          >
            Reset
          </Button>
          <Button size="sm" onClick={handleSave} loading={isPending}>
            {!isPending && <Check size={14} />}
            Save weights
          </Button>
        </div>
      </div>
    </div>
  );
}

const IMPORTANCE_LABELS = {
  1: "Low",
  2: "Somewhat",
  3: "Moderate",
  4: "Important",
  5: "Critical",
};
