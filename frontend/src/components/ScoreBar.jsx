import { scoreColor, formatScore } from "@/lib/utils";

/**
 * Horizontal progress bar showing a 0-100 score.
 * Colour transitions red → amber → green based on score value.
 */
export function ScoreBar({ score, showLabel = true, height = 6 }) {
  const pct = Math.min(Math.max(score ?? 0, 0), 100);
  const color = "var(--primary)";

  return (
    <div className="flex items-center gap-2">
      <div
        className="mh-track"
        style={{ height }}
      >
        <div
          className="mh-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-semibold mono" style={{ color, minWidth: "2.5rem", textAlign: "right" }}>
          {formatScore(score)}
        </span>
      )}
    </div>
  );
}

/** Mini inline score pill — used in leaderboard category columns. */
export function ScorePill({ score }) {
  const color = scoreColor(score);
  return (
    <span
      className="mh-scorepill mono"
      style={{ background: color }}
    >
      {formatScore(score)}
    </span>
  );
}
