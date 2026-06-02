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

// Convert percentage weights → 1-5 importance scores via min-max scaling.
// Equal weights → all 3. Single category → 5.
function percentagesToImportances(weights) {
  const entries = Object.entries(weights);
  const values = entries.map(([, v]) => v);
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) {
    return Object.fromEntries(entries.map(([k]) => [k, 3]));
  }
  return Object.fromEntries(
    entries.map(([k, v]) => [k, Math.round(1 + ((v - min) / (max - min)) * 4)])
  );
}

// Convert 1-5 importance scores → integer percentage weights summing to exactly 100.
// Uses largest-remainder method to avoid rounding drift.
function importancesToWeights(importances) {
  const entries = Object.entries(importances);
  const total = entries.reduce((sum, [, v]) => sum + v, 0);
  if (total === 0) return Object.fromEntries(entries.map(([k]) => [k, 0]));

  const exactPcts = entries.map(([k, v]) => ({ key: k, exact: (v / total) * 100 }));
  const floored = exactPcts.map((e) => ({ ...e, floored: Math.floor(e.exact) }));
  const remainder = 100 - floored.reduce((s, e) => s + e.floored, 0);

  // Distribute leftover points to categories with largest fractional parts
  const ranked = [...floored].sort(
    (a, b) => (b.exact - b.floored) - (a.exact - a.floored)
  );
  ranked.forEach((item, i) => {
    if (i < remainder) item.floored += 1;
  });

  return Object.fromEntries(floored.map(({ key, floored: pct }) => [key, pct]));
}

export function WeightsEditor({ jobId, currentWeights }) {
  const weights = currentWeights ?? DEFAULT_WEIGHTS;
  const [importances, setImportances] = useState(() => percentagesToImportances(weights));
  const { mutateAsync: updateJob, isPending } = useUpdateJob(jobId);

  const computedWeights = importancesToWeights(importances);

  const handleChange = (key, value) => {
    setImportances((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      await updateJob({ category_weights: computedWeights });
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
            style={{ width: `${computedWeights[key] ?? 0}%`, background: color }}
          />
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
            onClick={() => setImportances(percentagesToImportances(weights))}
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
