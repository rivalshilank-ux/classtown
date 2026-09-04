export interface LogoProps {
  href?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<LogoProps["size"]>, string> = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-2xl",
};

const MARK_SIZE_CLASSES: Record<NonNullable<LogoProps["size"]>, string> = {
  sm: "h-6 w-6 text-xs",
  md: "h-7 w-7 text-sm",
  lg: "h-9 w-9 text-base",
};

export function Logo({ href, size = "md", className }: LogoProps) {
  const wordmark = (
    <span
      className={[
        "inline-flex items-center gap-2 font-[family-name:var(--font-display)] tracking-wide text-cream-400",
        SIZE_CLASSES[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span
        aria-hidden="true"
        className={[
          "pixel-corners-sm inline-flex shrink-0 items-center justify-center border-2 border-ink-900 bg-accent-500 font-[family-name:var(--font-display)] text-ink-900",
          MARK_SIZE_CLASSES[size],
        ].join(" ")}
      >
        C
      </span>
      <span>ClassTown</span>
    </span>
  );

  if (!href) {
    return wordmark;
  }

  return (
    <a
      href={href}
      className="inline-block rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-wood-700"
    >
      {wordmark}
    </a>
  );
}
