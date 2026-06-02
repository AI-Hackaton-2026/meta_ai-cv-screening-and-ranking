import { cn } from "@/lib/utils";

const variants = {
  default: "bg-[var(--color-primary-light)] text-[var(--color-primary)] border border-[rgba(114,107,255,0.3)]",
  advance: "badge-advance",
  hold: "badge-hold",
  reject: "badge-reject",
  muted: "bg-gray-100 text-gray-600",
  processing: "bg-purple-50 text-purple-600",
};

export function Badge({ children, variant = "default", className, ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        variants[variant] ?? variants.default,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
