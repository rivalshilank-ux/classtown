import type { ButtonHTMLAttributes, ReactNode } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  /** Shows a spinner and disables the button — use for an in-flight async action, never toggle `disabled` separately for that. */
  isLoading?: boolean;
  children: ReactNode;
}

// primary uses 700/800, not 500/600 — white text on 500/600 measures
// 2.80:1 / 3.56:1, both below WCAG AA's 4.5:1 for normal text; 700/800
// measure 5.18:1 / 7.31:1.
const VARIANT_CLASSES: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-brand-700 text-white hover:bg-brand-800",
  secondary: "bg-neutral-100 text-neutral-900 hover:bg-neutral-200",
  ghost: "bg-transparent text-neutral-900 hover:bg-neutral-100",
};

const FOCUS_RING =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2";

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

/**
 * Base button shared by the game HUD, teacher dashboard, and admin
 * dashboard, so all three surfaces render from one component instead
 * of drifting into separate ad-hoc button styles.
 */
export function Button({
  variant = "primary",
  isLoading = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const classes = [
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 font-medium transition-colors",
    "disabled:cursor-not-allowed disabled:opacity-60",
    FOCUS_RING,
    VARIANT_CLASSES[variant],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      className={classes}
      disabled={disabled ?? isLoading}
      aria-busy={isLoading || undefined}
      {...rest}
    >
      {isLoading && <Spinner />}
      {children}
    </button>
  );
}
