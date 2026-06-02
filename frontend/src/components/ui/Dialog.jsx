import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

/**
 * Simple accessible dialog / modal.
 * Closes on Escape key and backdrop click.
 */
export function Dialog({ open, onClose, title, children, className, size = "md" }) {
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

  const maxW = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl", full: "max-w-5xl" }[size] ?? "max-w-lg";

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(40,44,52,0.45)" }}
      onClick={(e) => e.target === overlayRef.current && onClose?.()}
    >
      <div
        className={cn(
          "relative bg-[var(--color-card)] rounded-[var(--radius-xl)] w-full overflow-hidden",
          "shadow-[var(--shadow-modal)]",
          maxW,
          className
        )}
        style={{ maxHeight: "90vh", overflowY: "auto" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-base font-semibold text-[var(--color-ink)]">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--color-ink-muted)] hover:bg-[var(--color-primary-light)] hover:text-[var(--color-primary)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        {/* Body */}
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
