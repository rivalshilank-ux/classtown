/**
 * Prints the SHA-256 hash of an admin code, for setting ADMIN_CODE_HASH.
 * Run this once, put the hash (not the code) into the real environment's
 * config, and don't commit the raw code anywhere.
 *
 * Usage:
 *   pnpm --filter @classtown/web hash-admin-code -- "the-actual-code"
 */
import { createHash } from "node:crypto";

function main() {
  const code = process.argv[2];
  if (!code) {
    console.error('Usage: pnpm hash-admin-code -- "the-actual-code"');
    process.exitCode = 1;
    return;
  }

  const hash = createHash("sha256").update(code, "utf8").digest("hex");
  console.log(`ADMIN_CODE_HASH=${hash}`);
}

main();
