import type { HTMLAttributes, ReactNode } from "react";

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "wood" | "board" | "paper";
  children: ReactNode;
}

const VARIANT_CLASSES: Record<NonNullable<PanelProps["variant"]>, string> = {
  wood: "border-4 border-wood-900 bg-cream-500 text-ink-900 shadow-[0_5px_0_0_#3a2415]",
  board:
    "border-4 border-wood-800 bg-chalk-900 text-cream-400 shadow-[0_5px_0_0_#1a251e]",
  paper:
    "border-2 border-wood-600/70 bg-cream-400 text-ink-900 shadow-[0_3px_0_0_#e8d6ab]",
};

export function Panel({ variant = "wood", className, children, ...rest }: PanelProps) {
  const classes = [
    "pixel-corners p-5 sm:p-6",
    VARIANT_CLASSES[variant],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
