import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { consumeRateLimit, resetRateLimits } from "./rateLimit";

describe("consumeRateLimit", () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it("allows requests up to the limit", () => {
    for (let i = 0; i < 3; i += 1) {
      expect(consumeRateLimit("k", 3, 1000, 0)).toBe(true);
    }
  });

  it("blocks the request that exceeds the limit", () => {
    consumeRateLimit("k", 2, 1000, 0);
    consumeRateLimit("k", 2, 1000, 0);
    expect(consumeRateLimit("k", 2, 1000, 0)).toBe(false);
  });

  it("keeps separate counters per key", () => {
    consumeRateLimit("a", 1, 1000, 0);
    expect(consumeRateLimit("a", 1, 1000, 0)).toBe(false);
    expect(consumeRateLimit("b", 1, 1000, 0)).toBe(true);
  });

  it("starts a fresh window once the previous one has elapsed", () => {
    consumeRateLimit("k", 1, 1000, 0);
    expect(consumeRateLimit("k", 1, 1000, 500)).toBe(false);
    expect(consumeRateLimit("k", 1, 1000, 1000)).toBe(true);
  });
});
