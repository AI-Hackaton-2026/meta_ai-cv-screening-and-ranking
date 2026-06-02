import { cn } from "@/lib/utils";

export function Input({ className, label, error, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-medium text-[var(--color-ink-muted)]">{label}</label>
      )}
      <input
        className={cn(
          "w-full px-3 py-2 text-sm rounded-[var(--radius-md)]",
          "border border-[var(--color-border)] bg-white text-[var(--color-ink)]",
          "placeholder:text-[var(--color-ink-subtle)]",
          "focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]",
          "transition-colors",
          error && "border-red-400 focus:border-red-400 focus:ring-red-400",
          className
        )}
        {...props}
      />
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}

export function Textarea({ className, label, error, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-medium text-[var(--color-ink-muted)]">{label}</label>
      )}
      <textarea
        className={cn(
          "w-full px-3 py-2 text-sm rounded-[var(--radius-md)]",
          "border border-[var(--color-border)] bg-white text-[var(--color-ink)]",
          "placeholder:text-[var(--color-ink-subtle)]",
          "focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]",
          "transition-colors resize-y min-h-[100px]",
          error && "border-red-400",
          className
        )}
        {...props}
      />
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
