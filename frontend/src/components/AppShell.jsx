import { Link, useLocation } from "react-router-dom";
import { Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Top navigation bar + page wrapper.
 * Stays fixed at top; content scrolls below.
 */
export function AppShell({ children }) {
  const { pathname } = useLocation();
  const isWidePage = pathname.startsWith("/jobs/");

  return (
    <div className="min-h-full flex flex-col mh-page">
      <header className="mh-topnav">
        <Link to="/" className="mh-logo-link flex items-center gap-2 group">
          <img
            src="/metahire-logo-mark.png"
            alt=""
            className="h-11 w-11 object-contain"
            aria-hidden="true"
          />
          <div className="flex flex-col leading-none">
            <span className="text-[17px] font-semibold" style={{ color: "var(--foreground)" }}>
              Meta
              <span style={{ color: "var(--primary)" }}>Hire</span>
            </span>
            <span
              className="text-[11px] font-medium mt-1"
              style={{ color: "var(--subtle-foreground)" }}
            >
              AI CV Screening
            </span>
          </div>
        </Link>

        <div className="flex-1" />

        {/* Nav */}
        <nav className="mh-nav">
          <NavLink to="/" active={pathname === "/"}>
            <Briefcase size={14} />
            Jobs
          </NavLink>
        </nav>
      </header>

      <main className={cn("mh-main flex-1 w-full", isWidePage && "mh-main-wide")}>
        {children}
      </main>
    </div>
  );
}

function NavLink({ to, active, children }) {
  return (
    <Link
      to={to}
      className={cn(
        "mh-navlink",
        active && "is-active"
      )}
    >
      {children}
    </Link>
  );
}
