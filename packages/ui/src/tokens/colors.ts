/**
 * Placeholder design tokens. These exist so the game canvas (Phaser,
 * which can't read CSS custom properties) and the DOM UI (Tailwind
 * theme in apps/web/app/globals.css) can share one source of truth
 * for color values, keeping both in sync as the same literal hex.
 *
 * These specific values are provisional pending the real ClassTown
 * design system in Figma — do not treat them as final brand colors.
 */
export const colors = {
  brand: {
    // 500/600 read < 4.5:1 against both white and neutral-50 (measured:
    // 2.80:1 and 3.56:1) — keep them for non-text accents only (e.g. a
    // small swatch or a border), never for button/link text.
    500: "#f97316",
    600: "#ea580c",
    // 700/800 are the WCAG AA-passing pair for actual text: 700 as the
    // default (5.18:1 on white, 4.96:1 on neutral-50), 800 for hover/
    // active so the darkening reads as a real state change (7.31:1).
    700: "#c2410c",
    800: "#9a3412",
  },
  neutral: {
    50: "#fafaf9",
    100: "#f0efed",
    200: "#e5e3e0",
    900: "#1c1917",
  },
} as const;
