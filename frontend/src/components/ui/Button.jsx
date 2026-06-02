import { cn } from "@/lib/utils";

const variants = {
  primary: "mh-btn-primary",
  outline: "mh-btn-outline",
  ghost: "mh-btn-ghost",
  danger: "mh-btn-danger",
};

const sizes = {
  sm: "mh-btn-sm",
  md: "mh-btn-md",
  lg: "mh-btn-lg",
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
        "mh-btn",
        variants[variant] ?? variants.primary,
        sizes[size] ?? sizes.md,
        className
      )}
      {...props}
    >
      {loading && <span className="mh-spinner" />}
      {children}
    </button>
  );
}
