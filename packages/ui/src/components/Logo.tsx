export interface LogoProps {
  /** Renders as a link (plain `<a>` — this package doesn't depend on a router) when given. */
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

/**
 * ClassTown wordmark + mark. The one visual element every auth/teacher
 * screen shares with the game — without this, a teacher landing on
 * /login has nothing telling them which product they're looking at.
 */
export function Logo({ href, size = "md", className }: LogoProps) {
  const wordmark = (
    <span
      className={[
        "inline-flex items-center gap-2 font-bold tracking-tight text-neutral-900",
        SIZE_CLASSES[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span
        aria-hidden="true"
        className={[
          "inline-flex shrink-0 items-center justify-center rounded-lg bg-brand-700 font-bold text-white",
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
      className="inline-block rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2"
    >
      {wordmark}
    </a>
  );
}
