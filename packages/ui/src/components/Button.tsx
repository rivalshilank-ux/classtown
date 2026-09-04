import type { ButtonHTMLAttributes, ReactNode } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  children: ReactNode;
}

const VARIANT_CLASSES: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-brand-500 text-white hover:bg-brand-600",
  secondary: "bg-neutral-100 text-neutral-900 hover:bg-neutral-200",
};

/**
 * Base button shared by the game HUD, teacher dashboard, and admin
 * dashboard, so all three surfaces render from one component instead
 * of drifting into separate ad-hoc button styles.
 */
export function Button({
  variant = "primary",
  className,
  children,
  ...rest
}: ButtonProps) {
  const classes = [
    "rounded-lg px-4 py-2 font-medium transition-colors",
    VARIANT_CLASSES[variant],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
