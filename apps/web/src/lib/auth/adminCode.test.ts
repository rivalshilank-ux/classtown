import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { verifyAdminCode } from "./adminCode";

const originalHash = process.env.ADMIN_CODE_HASH;
const REAL_CODE = "correct-horse-battery-staple";
const REAL_HASH = createHash("sha256").update(REAL_CODE, "utf8").digest("hex");

describe("verifyAdminCode", () => {
  beforeEach(() => {
    process.env.ADMIN_CODE_HASH = REAL_HASH;
  });

  afterEach(() => {
    if (originalHash === undefined) {
      delete process.env.ADMIN_CODE_HASH;
    } else {
      process.env.ADMIN_CODE_HASH = originalHash;
    }
  });

  it("accepts the correct code", () => {
    expect(verifyAdminCode(REAL_CODE)).toBe(true);
  });

  it("rejects an incorrect code", () => {
    expect(verifyAdminCode("wrong-code")).toBe(false);
  });

  it("rejects an empty code", () => {
    expect(verifyAdminCode("")).toBe(false);
  });

  it("fails closed when ADMIN_CODE_HASH is not configured", () => {
    delete process.env.ADMIN_CODE_HASH;
    expect(verifyAdminCode(REAL_CODE)).toBe(false);
  });

  it("does not throw and rejects when ADMIN_CODE_HASH is malformed hex", () => {
    process.env.ADMIN_CODE_HASH = "not-valid-hex-!!";
    expect(() => verifyAdminCode(REAL_CODE)).not.toThrow();
    expect(verifyAdminCode(REAL_CODE)).toBe(false);
  });

  it("does not throw and rejects when ADMIN_CODE_HASH has the wrong length", () => {
    process.env.ADMIN_CODE_HASH = "ab";
    expect(() => verifyAdminCode(REAL_CODE)).not.toThrow();
    expect(verifyAdminCode(REAL_CODE)).toBe(false);
  });
});
