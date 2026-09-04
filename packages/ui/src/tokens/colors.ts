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
    500: "#f97316",
    600: "#ea580c",
  },
  neutral: {
    50: "#fafaf9",
    100: "#f0efed",
    200: "#e5e3e0",
    900: "#1c1917",
  },
} as const;
