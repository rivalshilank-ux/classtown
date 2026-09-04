import { describe, expect, it } from "vitest";
import { applyKeyChange } from "./KeyboardInput";
import { IDLE_KEY_STATE } from "./input";

describe("applyKeyChange", () => {
  it("sets a direction to true on key down", () => {
    const state = applyKeyChange(IDLE_KEY_STATE, "KeyW", true);
    expect(state.up).toBe(true);
  });

  it("supports both WASD and arrow keys for the same direction", () => {
    expect(applyKeyChange(IDLE_KEY_STATE, "ArrowUp", true).up).toBe(true);
    expect(applyKeyChange(IDLE_KEY_STATE, "KeyW", true).up).toBe(true);
    expect(applyKeyChange(IDLE_KEY_STATE, "ArrowLeft", true).left).toBe(true);
    expect(applyKeyChange(IDLE_KEY_STATE, "KeyA", true).left).toBe(true);
  });

  it("clears a direction on key up", () => {
    const down = applyKeyChange(IDLE_KEY_STATE, "KeyD", true);
    const up = applyKeyChange(down, "KeyD", false);
    expect(up.right).toBe(false);
  });

  it("ignores keys that aren't part of movement", () => {
    const state = applyKeyChange(IDLE_KEY_STATE, "Space", true);
    expect(state).toBe(IDLE_KEY_STATE);
  });

  it("returns the same reference when the state doesn't actually change", () => {
    const down = applyKeyChange(IDLE_KEY_STATE, "KeyW", true);
    const sameAgain = applyKeyChange(down, "KeyW", true);
    expect(sameAgain).toBe(down);
  });
});
