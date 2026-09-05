import Link from "next/link";
import { Logo } from "@classtown/ui";

const FOOTER_LINKS = [
  { href: "/about", label: "About" },
  { href: "/support", label: "Support" },
  { href: "/policy", label: "운영정책" },
  { href: "/terms", label: "이용약관" },
  { href: "/privacy", label: "개인정보처리방침" },
];

export function LandingFooter() {
  return (
    <footer className="flex flex-col items-center gap-4 border-t-4 border-ink-900 bg-wood-900 px-4 py-8 text-sm text-cream-400/70 sm:flex-row sm:justify-between">
      <Logo size="sm" />

      <nav aria-label="법적 문서 및 지원" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        {FOOTER_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="underline-offset-2 hover:text-cream-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-wood-900"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <p>&copy; {new Date().getFullYear()} ClassTown</p>
    </footer>
  );
}
