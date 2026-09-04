import type { ReactNode } from "react";
import { Logo } from "./Logo";

export interface HeaderProps {
  children?: ReactNode;
}

export function Header({ children }: HeaderProps) {
  return (
    <header className="flex w-full items-center justify-between border-b-4 border-wood-900 bg-wood-700 px-4 py-3 sm:px-6">
      <Logo href="/" />
      {children}
    </header>
  );
}
