import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

/**
 * A pre-gate in front of the real admin login (email+password against
 * Supabase Auth + admin_accounts), not a replacement for it -- see
 * docs/adr/0006-hidden-admin-entry.md. Verified server-side only; the real
 * code never reaches the client bundle, only a SHA-256 hash lives in
 * ADMIN_CODE_HASH (server env).
 *
 * Fails closed: if ADMIN_CODE_HASH isn't configured, every code is
 * rejected. This is a security gate, not a convenience default -- a missing
 * config must not silently turn it into a no-op.
 */
export function verifyAdminCode(code: string): boolean {
  const expectedHex = process.env.ADMIN_CODE_HASH;
  if (!expectedHex) {
    return false;
  }

  let expected: Buffer;
  try {
    expected = Buffer.from(expectedHex, "hex");
  } catch {
    return false;
  }

  const actual = createHash("sha256").update(code, "utf8").digest();

  // timingSafeEqual throws on a length mismatch rather than returning false,
  // and a malformed/wrong-length ADMIN_CODE_HASH shouldn't be able to crash
  // a login attempt -- treat any length mismatch as "not equal."
  if (actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
}
