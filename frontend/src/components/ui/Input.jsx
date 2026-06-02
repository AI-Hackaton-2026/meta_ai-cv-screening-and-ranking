import { cn } from "@/lib/utils";

export function Input({ className, label, error, ...props }) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-xs font-semibold text-[var(--foreground)]">{label}</label>
      )}
      <input
        className={cn(
          "w-full px-3 py-2.5 text-sm rounded-[var(--radius-md)]",
          "border border-[var(--input)] bg-white text-[var(--foreground)]",
          "placeholder:text-[var(--subtle-foreground)]",
          "focus:outline-none focus:border-[var(--primary)] focus:shadow-[var(--shadow-focus)]",
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
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-xs font-semibold text-[var(--foreground)]">{label}</label>
      )}
      <textarea
        className={cn(
          "w-full px-3 py-2.5 text-sm rounded-[var(--radius-md)]",
          "border border-[var(--input)] bg-white text-[var(--foreground)]",
          "placeholder:text-[var(--subtle-foreground)]",
          "focus:outline-none focus:border-[var(--primary)] focus:shadow-[var(--shadow-focus)]",
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
