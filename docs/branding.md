# Branding & Design Tokens

MetaHire uses the Symphony.is brand palette, extracted directly from the live site (June 2026).

## Colour Palette

| Token | Hex | Usage |
|---|---|---|
| `--color-primary` | `#726BFF` | Buttons, links, active states, focus rings, score accents |
| `--color-primary-hover` | `#5F57F0` | Button hover states |
| `--color-primary-light` | `rgba(114,107,255,0.1)` | Chip backgrounds, row hover, upload zone |
| `--color-primary-medium` | `rgba(114,107,255,0.2)` | Stronger accent fills |
| `--color-accent-sky` | `#33BBFF` | Secondary chart colour, stat chips |
| `--color-accent-magenta` | `#C44DFF` | Tertiary chart colour, highlights |
| `--color-ink` | `#282C34` | Primary text, headings |
| `--color-ink-muted` | `rgba(40,44,52,0.6)` | Secondary text, labels |
| `--color-ink-subtle` | `rgba(40,44,52,0.4)` | Placeholder text, disabled states |
| `--color-canvas` | `#FAFAFA` | Page background |
| `--color-card` | `#FFFFFF` | Card surfaces |
| `--color-card-hover` | `#F5F4FF` | Card hover state |
| `--color-border` | `#D9D9D9` | Lines, dividers, input borders |

## Status Colours

| Token | Hex | Usage |
|---|---|---|
| `--color-advance-bg` | `#D1FAE5` | Advance recommendation background |
| `--color-advance-text` | `#065F46` | Advance recommendation text |
| `--color-hold-bg` | `#FEF3C7` | Hold recommendation background |
| `--color-hold-text` | `#92400E` | Hold recommendation text |
| `--color-reject-bg` | `#FEE2E2` | Reject recommendation background |
| `--color-reject-text` | `#991B1B` | Reject recommendation text |

## Typography

**Font family:** Poppins (Google Fonts)
**Fallback:** -apple-system, "system-ui", "Segoe UI", Roboto, sans-serif

Weights used: 300 (light), 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

## Spacing & Radius

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | `6px` | Small controls |
| `--radius-md` | `10px` | Inputs, buttons, chips |
| `--radius-lg` | `16px` | Cards, panels |
| `--radius-xl` | `20px` | Modals, large cards |

## Shadows

| Token | Usage |
|---|---|
| `--shadow-card` | Default card shadow |
| `--shadow-card-hover` | Card hover — violet tint |
| `--shadow-modal` | Modal/dialog shadow |

## Token File

All tokens are in `frontend/src/styles/tokens.css` and imported globally via `main.css`.

The FE developer can update token values here and they propagate throughout the app — no other files need changing.

## Tailwind Integration

Tokens are wired into Tailwind v4 via `@theme inline` in `main.css`, allowing Tailwind utilities like `bg-primary`, `text-ink`, etc. to resolve to the token values.

## Notes for FE Developer

- The screenshot provided shows the **SymphlyHub** internal-tool design — a clean, light, card-based UI with the violet primary
- Dark mode surfaces (`#14161A`, `#1B1D23`, `#21252B`) are available in tokens.css but not wired by default — add a `.dark` class or `prefers-color-scheme` media query to activate
- The design intentionally avoids heavy gradients; the primary violet is used as a single accent colour on a near-white canvas
