import { useId } from "react";

/**
 * MetaHire custom two-tone icons.
 *
 * Purely presentational SVGs in the brand purple (#6b69ff) with a soft
 * light layer + gradient front, matching the app's primary tokens.
 * Each accepts `size` (px) and `className` and forwards extra props.
 *
 * Lucide is still used for small UI actions (X, trash, chevrons, etc.) —
 * these are meant for the larger, more decorative accent spots.
 */

const LIGHT = "rgba(107, 105, 255, 0.22)";

function useGradient() {
  const id = useId().replace(/:/g, "");
  return `mh-grad-${id}`;
}

function Svg({ size = 24, className, children, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

function GradientDef({ id }) {
  return (
    <defs>
      <linearGradient id={id} x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
        <stop stopColor="#8b89ff" />
        <stop offset="1" stopColor="#6b69ff" />
      </linearGradient>
    </defs>
  );
}

/** Funnel — screening / narrowing down candidates. */
export function FunnelIcon(props) {
  const g = useGradient();
  return (
    <Svg {...props}>
      <GradientDef id={g} />
      <path
        d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5c0 .4-.16.78-.44 1.06L14.5 11.6a1.5 1.5 0 0 0-.44 1.06v5.1a1.5 1.5 0 0 1-.83 1.34l-2 1A1.5 1.5 0 0 1 9 18.76v-6.1a1.5 1.5 0 0 0-.44-1.06L4.44 6.56A1.5 1.5 0 0 1 4 5.5Z"
        fill={`url(#${g})`}
      />
      <rect x="6" y="3.2" width="12" height="3.6" rx="1.5" fill={LIGHT} />
    </Svg>
  );
}

/** CV with a check badge — a CV that passed screening. */
export function CvCheckIcon(props) {
  const g = useGradient();
  return (
    <Svg {...props}>
      <GradientDef id={g} />
      <rect x="4.5" y="2.5" width="12" height="16" rx="2.5" fill={LIGHT} />
      <path
        d="M6 5.5A2 2 0 0 1 8 3.5h6.2c.5 0 1 .2 1.4.58l2.3 2.24c.4.38.6.9.6 1.43V18a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5.5Z"
        fill={`url(#${g})`}
      />
      <rect x="8.5" y="8" width="6.5" height="1.6" rx="0.8" fill="#fff" opacity="0.85" />
      <rect x="8.5" y="11.3" width="5" height="1.6" rx="0.8" fill="#fff" opacity="0.6" />
      <circle cx="17.5" cy="17.5" r="4" fill={`url(#${g})`} stroke="#fff" strokeWidth="1.4" />
      <path
        d="m15.8 17.5 1.2 1.2 2.1-2.3"
        stroke="#fff"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Match — two overlapping shapes (candidate ↔ position). */
export function MatchIcon(props) {
  const g = useGradient();
  return (
    <Svg {...props}>
      <GradientDef id={g} />
      <rect x="3.5" y="3.5" width="11" height="11" rx="3.5" fill={LIGHT} />
      <rect x="9.5" y="9.5" width="11" height="11" rx="3.5" fill={`url(#${g})`} />
    </Svg>
  );
}

/** AI sparkle — four-point star, used for AI-powered accents. */
export function SparkleIcon(props) {
  const g = useGradient();
  return (
    <Svg {...props}>
      <GradientDef id={g} />
      <path
        d="M12 2.5c.4 4.3 2.2 6.1 6.5 6.5-4.3.4-6.1 2.2-6.5 6.5-.4-4.3-2.2-6.1-6.5-6.5 4.3-.4 6.1-2.2 6.5-6.5Z"
        fill={`url(#${g})`}
      />
      <path
        d="M18.5 14.5c.2 2.1 1.1 3 3.2 3.2-2.1.2-3 1.1-3.2 3.2-.2-2.1-1.1-3-3.2-3.2 2.1-.2 3-1.1 3.2-3.2Z"
        fill={LIGHT}
      />
    </Svg>
  );
}

/** Ascending — rising bars, for ranking / score sections. */
export function AscendingIcon(props) {
  const g = useGradient();
  return (
    <Svg {...props}>
      <GradientDef id={g} />
      <rect x="3.5" y="13" width="4.2" height="7.5" rx="1.6" fill={LIGHT} />
      <rect x="9.9" y="9" width="4.2" height="11.5" rx="1.6" fill={`url(#${g})`} />
      <rect x="16.3" y="4.5" width="4.2" height="16" rx="1.6" fill={`url(#${g})`} />
      <circle cx="18.4" cy="3.2" r="2.2" fill={LIGHT} />
    </Svg>
  );
}
