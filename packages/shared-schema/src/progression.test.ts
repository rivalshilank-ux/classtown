import { describe, expect, it } from "vitest";
import {
  levelForXp,
  progressionForPlaySeconds,
  SECONDS_PER_XP,
  XP_PER_LEVEL,
  xpForPlaySeconds,
} from "./progression";

describe("xpForPlaySeconds", () => {
  it("is zero for no play time", () => {
    expect(xpForPlaySeconds(0)).toBe(0);
  });

  it("awards one XP per SECONDS_PER_XP of play", () => {
    expect(xpForPlaySeconds(SECONDS_PER_XP)).toBe(1);
    expect(xpForPlaySeconds(SECONDS_PER_XP * 10)).toBe(10);
  });

  it("floors a partial interval instead of rounding up", () => {
    expect(xpForPlaySeconds(SECONDS_PER_XP - 1)).toBe(0);
    expect(xpForPlaySeconds(SECONDS_PER_XP + 1)).toBe(1);
  });

  it("never goes negative for a negative input", () => {
    expect(xpForPlaySeconds(-100)).toBe(0);
  });

  it("is a pure function of total play time: same input, same output", () => {
    expect(xpForPlaySeconds(12_345)).toBe(xpForPlaySeconds(12_345));
  });
});

describe("levelForXp", () => {
  it("starts at level 1 with zero XP", () => {
    expect(levelForXp(0)).toBe(1);
  });

  it("stays at level 1 for anything under one full threshold", () => {
    expect(levelForXp(XP_PER_LEVEL - 1)).toBe(1);
  });

  it("reaches level 2 at exactly one threshold", () => {
    expect(levelForXp(XP_PER_LEVEL)).toBe(2);
  });

  it("keeps climbing with no cap", () => {
    expect(levelForXp(XP_PER_LEVEL * 10)).toBe(11);
  });

  it("never goes below level 1 for a negative input", () => {
    expect(levelForXp(-1)).toBe(1);
  });
});

describe("progressionForPlaySeconds", () => {
  it("combines xp and level consistently", () => {
    const seconds = SECONDS_PER_XP * XP_PER_LEVEL * 3;
    const result = progressionForPlaySeconds(seconds);
    expect(result).toEqual({
      xp: xpForPlaySeconds(seconds),
      level: levelForXp(xpForPlaySeconds(seconds)),
    });
    expect(result.level).toBe(4);
  });
});
