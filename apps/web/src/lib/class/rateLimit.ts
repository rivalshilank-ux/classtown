import "server-only";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Best-effort fixed-window limiter.
 *
 * This is per-process memory, so on a serverless deployment it throttles a
 * single warm instance rather than the whole fleet — enough to blunt a naive
 * script, not enough to be the only defence. It is paired with rotatable class
 * codes and the per-class `join_open` switch, and a shared store (Redis, or a
 * counter table) should replace it before the first real deployment.
 */
export function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): boolean {
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    pruneExpired(now);
    return true;
  }

  if (existing.count >= limit) {
    return false;
  }

  existing.count += 1;
  return true;
}

function pruneExpired(now: number): void {
  if (buckets.size < 512) {
    return;
  }
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) {
      buckets.delete(key);
    }
  }
}

/** Test seam — the module keeps state between calls by design. */
export function resetRateLimits(): void {
  buckets.clear();
}
