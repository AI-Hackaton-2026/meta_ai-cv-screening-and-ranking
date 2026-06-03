export const DEFAULT_WEIGHTS = { skills: 35, experience: 30, education: 20, domain_fit: 15 };

const CATEGORY_KEYS = ["skills", "experience", "education", "domain_fit"];
const IMPORTANCE_WEIGHT = { 1: 1, 2: 2, 3: 4, 4: 8, 5: 16 };

export function completeWeights(weights) {
  const source = weights ?? DEFAULT_WEIGHTS;
  return Object.fromEntries(
    CATEGORY_KEYS.map((key) => [key, source[key] ?? (weights ? 0 : DEFAULT_WEIGHTS[key])])
  );
}

// Convert percentage weights -> 1-5 importance scores via min-max scaling.
// Equal weights -> all 3. Single category -> 5.
export function percentagesToImportances(weights) {
  const entries = Object.entries(completeWeights(weights));
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

// Convert 1-5 importance scores -> integer percentage weights summing to exactly 100.
// Uses a nonlinear curve so Critical vs Low creates a decisive weighting split.
export function importancesToWeights(importances) {
  const entries = CATEGORY_KEYS.map((key) => [key, importances[key] ?? 3]);
  const total = entries.reduce((sum, [, v]) => sum + (IMPORTANCE_WEIGHT[v] ?? 1), 0);
  if (total === 0) return Object.fromEntries(entries.map(([k]) => [k, 0]));

  const exactPcts = entries.map(([k, v]) => ({
    key: k,
    exact: ((IMPORTANCE_WEIGHT[v] ?? 1) / total) * 100,
  }));
  const floored = exactPcts.map((e) => ({ ...e, floored: Math.floor(e.exact) }));
  const remainder = 100 - floored.reduce((s, e) => s + e.floored, 0);

  const ranked = [...floored].sort(
    (a, b) => (b.exact - b.floored) - (a.exact - a.floored)
  );
  ranked.forEach((item, i) => {
    if (i < remainder) item.floored += 1;
  });

  return Object.fromEntries(floored.map(({ key, floored: pct }) => [key, pct]));
}
