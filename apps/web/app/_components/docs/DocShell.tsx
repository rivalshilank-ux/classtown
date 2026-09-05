import type { ReactNode } from "react";
import Link from "next/link";
import { Header } from "@classtown/ui";
import { LandingFooter } from "../LandingFooter";

export interface DocTocItem {
  id: string;
  label: string;
}

export interface DocShellProps {
  /** Small eyebrow label above the title, e.g. "법적 문서" or "가이드". */
  category: string;
  title: string;
  description: string;
  effectiveDate: string;
  /** Label in front of effectiveDate — "시행일" for legal docs, "최초 게시일" for guides. */
  dateLabel?: string;
  lastUpdated?: string;
  toc: DocTocItem[];
  children: ReactNode;
}

export function DocShell({
  category,
  title,
  description,
  effectiveDate,
  dateLabel = "시행일",
  lastUpdated,
  toc,
  children,
}: DocShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-cream-500">
      <Header />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
        <nav aria-label="이동 경로" className="text-xs text-ink-600">
          <Link href="/" className="underline decoration-wood-600/50 underline-offset-2 hover:text-ink-900">
            홈
          </Link>
          <span className="mx-1.5" aria-hidden="true">
            /
          </span>
          <span className="text-ink-900">{title}</span>
        </nav>

        <div className="flex flex-col gap-2 border-b-4 border-wood-900 pb-6">
          <span className="font-[family-name:var(--font-display)] text-xs tracking-wide text-ink-600">
            {category}
          </span>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-ink-900 sm:text-4xl">
            {title}
          </h1>
          <p className="max-w-xl text-sm text-ink-600 sm:text-base">{description}</p>
          <p className="pt-1 text-xs text-ink-600">
            {dateLabel} {effectiveDate}
            {lastUpdated && lastUpdated !== effectiveDate ? ` · 최종 수정일 ${lastUpdated}` : ""}
          </p>
        </div>

        {toc.length > 0 && (
          <nav
            aria-label="문서 목차"
            className="pixel-corners-sm border-2 border-wood-600/50 bg-cream-400 p-4 sm:p-5"
          >
            <p className="mb-3 font-[family-name:var(--font-display)] text-xs tracking-wide text-ink-600">
              목차
            </p>
            <ol className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
              {toc.map((item, index) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="text-ink-900 underline decoration-wood-600/40 underline-offset-2 hover:text-wood-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
                  >
                    {index + 1}. {item.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        <div className="flex flex-col gap-10">{children}</div>
      </main>

      <LandingFooter />
    </div>
  );
}

export function DocSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 flex flex-col gap-3">
      <h2 className="font-[family-name:var(--font-display)] text-lg text-ink-900 sm:text-xl">
        {title}
      </h2>
      <div className="flex flex-col gap-3 text-sm leading-relaxed text-ink-900 sm:text-base [&_a]:underline [&_a]:decoration-wood-600/40 [&_a]:underline-offset-2 [&_a]:hover:text-wood-800 [&_li]:leading-relaxed [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:flex [&_ol]:flex-col [&_ol]:gap-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1">
        {children}
      </div>
    </section>
  );
}
