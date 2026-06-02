import { statusMeta } from "@/lib/utils";

/** Shows candidate processing status with colour-coded dot. */
export function StatusBadge({ status }) {
  const { label, color } = statusMeta(status);
  const isSpinning = status === "processing";

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color }}>
      {isSpinning ? (
        <span className="mh-spinner" style={{ width: 9, height: 9, borderWidth: 2 }} />
      ) : (
        <span className="w-2 h-2 rounded-full" style={{ background: color }} />
      )}
      {label}
    </span>
  );
}
