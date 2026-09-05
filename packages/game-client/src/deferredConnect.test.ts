import { describe, expect, it } from "vitest";
import { deferCancelable } from "./deferredConnect";

function flushMicrotasks() {
  return Promise.resolve().then(() => Promise.resolve());
}

describe("deferCancelable", () => {
  it("runs fn on a later microtask, not synchronously", () => {
    let ran = false;
    deferCancelable(() => {
      ran = true;
    });
    expect(ran).toBe(false);
  });

  it("runs fn if never cancelled", async () => {
    let ran = false;
    deferCancelable(() => {
      ran = true;
    });
    await flushMicrotasks();
    expect(ran).toBe(true);
  });

  it("never runs fn if cancelled before the microtask fires", async () => {
    let ran = false;
    const task = deferCancelable(() => {
      ran = true;
    });
    task.cancel();
    await flushMicrotasks();
    expect(ran).toBe(false);
  });

  it("cancelling after fn already ran is a no-op", async () => {
    let calls = 0;
    const task = deferCancelable(() => {
      calls += 1;
    });
    await flushMicrotasks();
    task.cancel();
    await flushMicrotasks();
    expect(calls).toBe(1);
  });

  /**
   * Models React StrictMode's development-only replay of an effect as
   * mount -> cleanup -> mount, which happens synchronously before any
   * microtask runs. The first (discarded) mount's side effect must never
   * fire; only the second (surviving) mount's should.
   */
  it("survives a StrictMode-style mount -> cleanup -> mount replay: only the second attempt runs", async () => {
    const order: string[] = [];

    const first = deferCancelable(() => order.push("first"));
    first.cancel(); // synchronous cleanup of the discarded first mount
    const second = deferCancelable(() => order.push("second"));

    await flushMicrotasks();

    expect(order).toEqual(["second"]);
    void second;
  });
});
