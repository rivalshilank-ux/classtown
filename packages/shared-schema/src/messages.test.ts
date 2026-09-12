import { describe, expect, it } from "vitest";
import { chatMessageSchema, joinRoomOptionsSchema } from "./messages.js";

describe("joinRoomOptionsSchema", () => {
  it("accepts a valid join payload", () => {
    const result = joinRoomOptionsSchema.safeParse({
      joinCode: "ABCD12",
      nickname: "Alex",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty nickname", () => {
    const result = joinRoomOptionsSchema.safeParse({
      joinCode: "ABCD12",
      nickname: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("chatMessageSchema", () => {
  it("accepts a normal message", () => {
    const result = chatMessageSchema.safeParse({ text: "안녕하세요!" });
    expect(result.success).toBe(true);
  });

  it("trims surrounding whitespace", () => {
    const result = chatMessageSchema.safeParse({ text: "  hi  " });
    expect(result.success).toBe(true);
    expect(result.success && result.data.text).toBe("hi");
  });

  it("rejects an empty message", () => {
    const result = chatMessageSchema.safeParse({ text: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a whitespace-only message", () => {
    const result = chatMessageSchema.safeParse({ text: "   " });
    expect(result.success).toBe(false);
  });

  it("rejects a message over 200 characters", () => {
    const result = chatMessageSchema.safeParse({ text: "a".repeat(201) });
    expect(result.success).toBe(false);
  });

  it("accepts a message at exactly the 200 character limit", () => {
    const result = chatMessageSchema.safeParse({ text: "a".repeat(200) });
    expect(result.success).toBe(true);
  });

  it("ignores fields other than text", () => {
    const result = chatMessageSchema.safeParse({
      text: "hi",
      sessionId: "forged",
      nickname: "forged",
    });
    expect(result.success).toBe(true);
    expect(result.success && Object.keys(result.data)).toEqual(["text"]);
  });
});
