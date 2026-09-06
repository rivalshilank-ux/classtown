import type { ButtonHTMLAttributes, ReactNode } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "md" | "lg";
  isLoading?: boolean;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "border-ink-900 bg-accent-500 text-ink-900 shadow-[0_4px_0_0_#3a2415] hover:bg-accent-600 active:translate-y-[3px] active:shadow-[0_1px_0_0_#3a2415]",
  secondary:
    "border-wood-900 bg-wood-600 text-cream-400 shadow-[0_4px_0_0_#3a2415] hover:bg-wood-700 active:translate-y-[3px] active:shadow-[0_1px_0_0_#3a2415]",
  ghost:
    "border-transparent bg-transparent text-ink-900 hover:border-wood-400 hover:bg-cream-500",
};

const SIZE_CLASSES: Record<NonNullable<ButtonProps["size"]>, string> = {
  md: "gap-2 px-5 py-2.5 text-sm",
  lg: "flex-col gap-1 px-6 py-6 text-2xl",
};

const FOCUS_RING =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-400";

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

export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const classes = [
    "pixel-corners inline-flex items-center justify-center border-2",
    "font-[family-name:var(--font-display)] tracking-wide transition-[transform,box-shadow,background-color]",
    "disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none disabled:translate-y-0",
    FOCUS_RING,
    SIZE_CLASSES[size],
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
