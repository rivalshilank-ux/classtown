import "server-only";

export interface PagedResult<T> {
  items: T[];
  total: number;
}

/**
 * Escapes Postgres LIKE/ILIKE wildcard characters so a search string is
 * matched literally. Supabase-js parameterizes the resulting value through
 * PostgREST rather than concatenating raw SQL, so this is about correct
 * "contains this substring" matching, not SQL injection.
 */
export function escapeLikePattern(value: string): string {
  return value.replace(/[%_\\]/g, (match) => `\\${match}`);
}

export function toLikePattern(value: string): string {
  return `%${escapeLikePattern(value)}%`;
}

export function pageRange(page: number, pageSize: number): { from: number; to: number } {
  const safePage = Math.max(1, page);
  const from = (safePage - 1) * pageSize;
  return { from, to: from + pageSize - 1 };
}
