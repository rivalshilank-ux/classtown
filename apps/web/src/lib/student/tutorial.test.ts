import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hasSeenTutorial, markTutorialSeen } from "./tutorial";

/** Same minimal in-memory stand-in as session.test.ts -- no jsdom in this project. */
function createFakeStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
    key: () => null,
    get length() {
      return store.size;
    },
  };
}

describe("tutorial seen flag", () => {
  beforeEach(() => {
    vi.stubGlobal("sessionStorage", createFakeStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is false before anything is marked", () => {
    expect(hasSeenTutorial()).toBe(false);
  });

  it("is true after marking it seen", () => {
    markTutorialSeen();
    expect(hasSeenTutorial()).toBe(true);
  });

  it("never throws when sessionStorage itself is unavailable (e.g. private mode)", () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("SecurityError");
      },
    });

    expect(() => markTutorialSeen()).not.toThrow();
    expect(hasSeenTutorial()).toBe(false);
  });
});
