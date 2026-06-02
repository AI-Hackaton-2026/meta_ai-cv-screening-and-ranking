import { scoreColor, formatScore } from "@/lib/utils";

/**
 * Horizontal progress bar showing a 0-100 score.
 * Colour transitions red → amber → green based on score value.
 */
export function ScoreBar({ score, showLabel = true, height = 6 }) {
  const pct = Math.min(Math.max(score ?? 0, 0), 100);
  const color = scoreColor(score);

  return (
    <div className="flex items-center gap-2">
      <div
        className="flex-1 rounded-full overflow-hidden"
        style={{ height, background: "var(--color-border)" }}
      >
        <div
          className="score-bar-fill h-full rounded-full"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium tabular-nums" style={{ color, minWidth: "2.5rem" }}>
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
      className="inline-flex items-center justify-center w-10 h-5 rounded-full text-[10px] font-semibold tabular-nums text-white"
      style={{ background: color }}
    >
      {formatScore(score)}
    </span>
  );
}
