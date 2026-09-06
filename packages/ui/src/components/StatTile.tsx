import type { HTMLAttributes, ReactNode } from "react";
import { PixelIcon, type PixelGlyphName } from "./PixelIcon";

export interface StatTileProps extends HTMLAttributes<HTMLDivElement> {
  icon?: PixelGlyphName;
  /** Rendered in place of `icon` when the stat is better shown as a status indicator. */
  indicator?: ReactNode;
  value: ReactNode;
  label: string;
}

export function StatTile({ icon, indicator, value, label, className, ...rest }: StatTileProps) {
  const classes = [
    "pixel-corners-sm flex items-center gap-3 border-2 border-wood-600/50 bg-cream-400 px-3 py-2.5",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} {...rest}>
      {icon && <PixelIcon name={icon} size={24} className="shrink-0 text-wood-700" />}
      {indicator}
      <div className="flex flex-col leading-tight">
        <span className="font-[family-name:var(--font-display)] text-xl text-ink-900">{value}</span>
        <span className="text-xs text-ink-600">{label}</span>
      </div>
    </div>
  );
}
