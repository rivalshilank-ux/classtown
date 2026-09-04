import type { ReactNode } from "react";
import { Logo } from "./Logo";

export interface HeaderProps {
  /** Optional right-aligned slot, e.g. a logout button on /teacher. */
  children?: ReactNode;
}

/**
 * Minimal brand header shared by auth and teacher screens. Deliberately
 * just a logo (+ optional right-side action) — no nav menu, since there's
 * nothing yet to navigate to.
 */
export function Header({ children }: HeaderProps) {
  return (
    <header className="flex w-full items-center justify-between px-4 py-4 sm:px-6">
      <Logo href="/" />
      {children}
    </header>
  );
}
