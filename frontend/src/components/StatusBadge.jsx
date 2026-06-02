import { statusMeta } from "@/lib/utils";

/** Shows candidate processing status with colour-coded dot. */
export function StatusBadge({ status }) {
  const { label, color } = statusMeta(status);
  const isSpinning = status === "processing";

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color }}>
      {isSpinning ? (
        <span
          className="w-2 h-2 rounded-full border-2 border-current border-t-transparent animate-spin"
        />
      ) : (
        <span className="w-2 h-2 rounded-full" style={{ background: color }} />
      )}
      {label}
    </span>
  );
}
