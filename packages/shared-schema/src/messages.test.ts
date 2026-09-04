import { describe, expect, it } from "vitest";
import { joinRoomOptionsSchema } from "./messages.js";

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
