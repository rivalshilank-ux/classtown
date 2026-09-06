"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@classtown/ui";

interface NavItem {
  href: string;
  label: string;
  implemented: boolean;
}

// Sections are listed in full per the Admin Operations Center spec even
// though only Overview exists so far -- each one becomes a real link as its
// phase lands, rather than the nav silently growing later with no record of
// what was always intended to be there.
const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Overview", implemented: true },
  { href: "/admin/teachers", label: "Teachers", implemented: true },
  { href: "/admin/classes", label: "Classes", implemented: true },
  { href: "/admin/students", label: "Students", implemented: true },
  { href: "/admin/moderation", label: "Moderation", implemented: false },
  { href: "/admin/announcements", label: "Announcements", implemented: true },
  { href: "/admin/system", label: "System Health", implemented: true },
  { href: "/admin/updates", label: "Updates", implemented: true },
  { href: "/admin/ai", label: "AI Ops", implemented: true },
  { href: "/admin/audit", label: "Audit Logs", implemented: true },
  { href: "/admin/settings", label: "Settings", implemented: false },
];

export function AdminNav() {
  const currentPath = usePathname();

  return (
    <nav
      className="flex w-full flex-wrap gap-2 border-b-4 border-wood-900 bg-wood-700 px-4 py-2 sm:px-6"
      aria-label="관리자 메뉴"
    >
      {NAV_ITEMS.map((item) =>
        item.implemented ? (
          <Link
            key={item.href}
            href={item.href}
            className={`pixel-corners-sm border-2 px-3 py-1.5 font-[family-name:var(--font-display)] text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 ${
              currentPath === item.href
                ? "border-ink-900 bg-accent-500 text-ink-900"
                : "border-cream-400/40 bg-wood-800 text-cream-400 hover:bg-wood-900"
            }`}
          >
            {item.label}
          </Link>
        ) : (
          <span
            key={item.href}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-cream-400/40"
          >
            {item.label}
            <Badge tone="wood" className="opacity-60">
              준비 중
            </Badge>
          </span>
        ),
      )}
    </nav>
  );
}
