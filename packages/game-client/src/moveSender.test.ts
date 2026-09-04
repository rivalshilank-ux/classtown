import { describe, expect, it, vi } from "vitest";
import { sendMoveIntent } from "./moveSender";

describe("sendMoveIntent", () => {
  it("sends exactly a { dx, dy } payload as a 'move' message", () => {
    const room = { send: vi.fn() };
    sendMoveIntent(room, { dx: 0.5, dy: -0.5 });

    expect(room.send).toHaveBeenCalledWith("move", { dx: 0.5, dy: -0.5 });
    const [, payload] = room.send.mock.calls[0] as [string, Record<string, unknown>];
    expect(Object.keys(payload).sort()).toEqual(["dx", "dy"]);
  });

  it("throws instead of sending an absolute position, so the client can never assert its own position", () => {
    const room = { send: vi.fn() };
    expect(() => sendMoveIntent(room, { x: 999, y: 999 } as never)).toThrow();
    expect(room.send).not.toHaveBeenCalled();
  });

  it("throws instead of sending a dx/dy outside the server-validated range", () => {
    const room = { send: vi.fn() };
    expect(() => sendMoveIntent(room, { dx: 5, dy: 5 })).toThrow();
    expect(room.send).not.toHaveBeenCalled();
  });
});
