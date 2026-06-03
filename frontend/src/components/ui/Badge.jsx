import { cn } from "@/lib/utils";

const variants = {
  default: "mh-badge-default",
  advance: "mh-badge-advance",
  hold: "mh-badge-hold",
  reject: "mh-badge-reject",
  muted: "mh-badge-muted",
  processing: "mh-badge-processing",
};

export function Badge({ children, variant = "default", className, ...props }) {
  return (
    <span className={cn("mh-badge", variants[variant] ?? variants.default, className)} {...props}>
      {children}
    </span>
  );
}
