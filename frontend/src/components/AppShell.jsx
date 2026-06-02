import { Link, useLocation } from "react-router-dom";
import { Briefcase, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Top navigation bar + page wrapper.
 * Stays fixed at top; content scrolls below.
 */
export function AppShell({ children }) {
  const { pathname } = useLocation();

  return (
    <div className="min-h-full flex flex-col">
      <header
        className="sticky top-0 z-40 flex items-center gap-3 px-6 py-3 border-b border-[var(--color-border)]"
        style={{ background: "rgba(255,255,255,0.92)" }}
      >
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg"
            style={{ background: "var(--color-primary)" }}
          >
            <Sparkles size={16} className="text-white" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>
              Meta
              <span style={{ color: "var(--color-primary)" }}>Hire</span>
            </span>
            <span className="text-[10px]" style={{ color: "var(--color-ink-subtle)" }}>
              AI Screening
            </span>
          </div>
        </Link>

        <div className="flex-1" />

        {/* Nav */}
        <nav className="flex items-center gap-1">
          <NavLink to="/" active={pathname === "/"}>
            <Briefcase size={14} />
            Jobs
          </NavLink>
        </nav>
      </header>

      <main className="flex-1 px-6 py-6 max-w-7xl mx-auto w-full">{children}</main>
    </div>
  );
}

function NavLink({ to, active, children }) {
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] text-sm font-medium transition-colors",
        active
          ? "bg-[var(--color-primary-light)] text-[var(--color-primary)]"
          : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-gray-100"
      )}
    >
      {children}
    </Link>
  );
}
