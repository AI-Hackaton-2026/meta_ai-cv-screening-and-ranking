import { cn } from "@/lib/utils";

const variants = {
  primary:
    "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] shadow-sm",
  outline:
    "border border-[var(--color-border)] text-[var(--color-ink)] hover:bg-[var(--color-primary-light)] hover:border-[var(--color-primary)]",
  ghost: "text-[var(--color-ink-muted)] hover:bg-[var(--color-primary-light)] hover:text-[var(--color-primary)]",
  danger: "bg-red-500 text-white hover:bg-red-600",
};

const sizes = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-sm",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  disabled,
  loading,
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-medium",
        "transition-all duration-150 cursor-pointer",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant] ?? variants.primary,
        sizes[size] ?? sizes.md,
        className
      )}
      {...props}
    >
      {loading && (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}
