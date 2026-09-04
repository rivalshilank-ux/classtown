import { describe, expect, it } from "vitest";
import { computeMoveIntent, moveIntentsEqual, IDLE_KEY_STATE } from "./input";

describe("computeMoveIntent", () => {
  it("returns zero intent when no keys are held", () => {
    expect(computeMoveIntent(IDLE_KEY_STATE)).toEqual({ dx: 0, dy: 0 });
  });

  it("moves right", () => {
    expect(computeMoveIntent({ ...IDLE_KEY_STATE, right: true })).toEqual({
      dx: 1,
      dy: 0,
    });
  });

  it("moves up as negative dy", () => {
    expect(computeMoveIntent({ ...IDLE_KEY_STATE, up: true })).toEqual({
      dx: 0,
      dy: -1,
    });
  });

  it("cancels out opposite keys held together", () => {
    expect(
      computeMoveIntent({ ...IDLE_KEY_STATE, left: true, right: true }),
    ).toEqual({ dx: 0, dy: 0 });
  });

  it("normalizes diagonal input so it isn't faster than a single axis", () => {
    const intent = computeMoveIntent({
      ...IDLE_KEY_STATE,
      right: true,
      down: true,
    });
    expect(Math.hypot(intent.dx, intent.dy)).toBeCloseTo(1, 5);
    expect(intent.dx).toBeGreaterThan(0);
    expect(intent.dy).toBeGreaterThan(0);
  });

  it("always stays within the server's validated [-1, 1] range", () => {
    const intent = computeMoveIntent({
      up: true,
      down: false,
      left: true,
      right: false,
    });
    expect(intent.dx).toBeGreaterThanOrEqual(-1);
    expect(intent.dx).toBeLessThanOrEqual(1);
    expect(intent.dy).toBeGreaterThanOrEqual(-1);
    expect(intent.dy).toBeLessThanOrEqual(1);
  });
});

describe("moveIntentsEqual", () => {
  it("compares intents by value", () => {
    expect(moveIntentsEqual({ dx: 1, dy: 0 }, { dx: 1, dy: 0 })).toBe(true);
    expect(moveIntentsEqual({ dx: 1, dy: 0 }, { dx: 0, dy: 1 })).toBe(false);
  });
});
