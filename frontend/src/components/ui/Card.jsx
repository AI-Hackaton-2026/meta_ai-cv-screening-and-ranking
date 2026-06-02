import { cn } from "@/lib/utils";

export function Card({ children, className, clickable, ...props }) {
  return (
    <div
      className={cn("card mh-card p-5", clickable && "mh-card-clickable", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }) {
  return <div className={cn("mb-3", className)}>{children}</div>;
}

export function CardTitle({ children, className }) {
  return (
    <h3 className={cn("text-base font-semibold text-[var(--color-ink)]", className)}>
      {children}
    </h3>
  );
}
