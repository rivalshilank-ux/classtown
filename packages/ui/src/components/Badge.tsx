import type { HTMLAttributes, ReactNode } from "react";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: "wood" | "accent" | "good" | "bad";
  children: ReactNode;
}

const TONE_CLASSES: Record<NonNullable<BadgeProps["tone"]>, string> = {
  wood: "border-wood-900 bg-wood-600 text-cream-400",
  accent: "border-ink-900 bg-accent-500 text-ink-900",
  good: "border-ink-900 bg-good text-cream-400",
  bad: "border-ink-900 bg-bad text-cream-400",
};

export function Badge({ tone = "wood", className, children, ...rest }: BadgeProps) {
  const classes = [
    "pixel-corners-sm inline-flex items-center gap-1 border-2 px-2 py-0.5",
    "font-[family-name:var(--font-display)] text-xs tracking-wide",
    TONE_CLASSES[tone],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes} {...rest}>
      {children}
    </span>
  );
}
