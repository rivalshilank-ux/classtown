import type { HTMLAttributes } from "react";

export interface StatusDotProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: "good" | "warn" | "stone" | "bad";
  label?: string;
}

const TONE_CLASSES: Record<NonNullable<StatusDotProps["tone"]>, string> = {
  good: "bg-good",
  warn: "bg-accent-500",
  stone: "bg-stone",
  bad: "bg-bad",
};

export function StatusDot({ tone = "good", label, className, ...rest }: StatusDotProps) {
  const dot = (
    <span
      aria-hidden={label ? true : undefined}
      className={["h-2.5 w-2.5 shrink-0 rounded-full border border-ink-900/40", TONE_CLASSES[tone], className]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    />
  );

  if (!label) {
    return dot;
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      {dot}
      <span className="text-sm text-ink-900">{label}</span>
    </span>
  );
}
