import type { HTMLAttributes, ReactNode } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/**
 * Groups a form (or other tightly related content) visually. This is a
 * one-per-page primitive, not a section-chunking pattern — reach for it
 * to frame *the* form on a page, not to wrap every subsection of one.
 */
export function Card({ className, children, ...rest }: CardProps) {
  const classes = [
    "w-full rounded-xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8",
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
