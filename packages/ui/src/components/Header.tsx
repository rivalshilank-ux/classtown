import type { ReactNode } from "react";
import { Logo } from "./Logo";

export interface HeaderProps {
  children?: ReactNode;
}

export function Header({ children }: HeaderProps) {
  return (
    <header className="flex w-full items-center justify-between px-4 py-4 sm:px-6">
      <Logo href="/" />
      {children}
    </header>
  );
}
