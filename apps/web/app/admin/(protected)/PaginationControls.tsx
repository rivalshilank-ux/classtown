import Link from "next/link";

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  basePath: string;
  query?: Record<string, string | undefined>;
}

function buildHref(
  basePath: string,
  query: Record<string, string | undefined> | undefined,
  page: number,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value) {
      params.set(key, value);
    }
  }
  if (page > 1) {
    params.set("page", String(page));
  }
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

const LINK_CLASSES =
  "pixel-corners-sm border-2 border-wood-600 bg-cream-400 px-3 py-1.5 font-[family-name:var(--font-display)] text-xs text-ink-900 hover:bg-cream-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";

export function PaginationControls({
  page,
  totalPages,
  basePath,
  query,
}: PaginationControlsProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav className="flex items-center justify-between" aria-label="페이지 이동">
      {page > 1 ? (
        <Link href={buildHref(basePath, query, page - 1)} className={LINK_CLASSES}>
          이전
        </Link>
      ) : (
        <span className={`${LINK_CLASSES} pointer-events-none opacity-40`}>이전</span>
      )}
      <span className="text-sm text-ink-600">
        {page} / {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={buildHref(basePath, query, page + 1)} className={LINK_CLASSES}>
          다음
        </Link>
      ) : (
        <span className={`${LINK_CLASSES} pointer-events-none opacity-40`}>다음</span>
      )}
    </nav>
  );
}
