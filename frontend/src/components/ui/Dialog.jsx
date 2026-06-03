import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export function Dialog({
  open,
  onClose,
  title,
  children,
  className,
  bodyClassName,
  size = "md",
  style,
}) {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const maxW =
    { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl", full: "max-w-6xl" }[size] ??
    "max-w-lg";

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(30,27,75,0.45)" }}
      onClick={(e) => e.target === overlayRef.current && onClose?.()}
    >
      <div
        className={cn(
          "relative bg-[var(--card)] rounded-[var(--radius-xl)] w-full overflow-hidden",
          maxW,
          className
        )}
        style={{
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "var(--shadow-modal)",
          animation: "mh-pop var(--dur-med) var(--ease-out)",
          ...style,
        }}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)]">
          <h2 className="text-base font-semibold text-[var(--foreground)]">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[var(--radius-md)] text-[var(--muted-foreground)] hover:bg-[var(--primary-light)] hover:text-[var(--primary)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className={cn("px-6 py-5", bodyClassName)}>{children}</div>
      </div>
    </div>
  );
}
