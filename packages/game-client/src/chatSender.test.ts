import { describe, expect, it, vi } from "vitest";
import { sendChatMessage } from "./chatSender";

describe("sendChatMessage", () => {
  it("sends exactly a { text } payload as a 'chat' message", () => {
    const room = { send: vi.fn() };
    sendChatMessage(room, { text: "hello" });

    expect(room.send).toHaveBeenCalledWith("chat", { text: "hello" });
  });

  it("trims the message before sending", () => {
    const room = { send: vi.fn() };
    sendChatMessage(room, { text: "  hi  " });

    expect(room.send).toHaveBeenCalledWith("chat", { text: "hi" });
  });

  it("throws instead of sending an empty message", () => {
    const room = { send: vi.fn() };
    expect(() => sendChatMessage(room, { text: "   " })).toThrow();
    expect(room.send).not.toHaveBeenCalled();
  });

  it("throws instead of sending a message over the length limit", () => {
    const room = { send: vi.fn() };
    expect(() => sendChatMessage(room, { text: "a".repeat(201) })).toThrow();
    expect(room.send).not.toHaveBeenCalled();
  });
});
