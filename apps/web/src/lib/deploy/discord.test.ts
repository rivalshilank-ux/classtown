import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { postDiscordReport } from "./discord";

const originalWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
const originalFetch = global.fetch;

describe("postDiscordReport", () => {
  beforeEach(() => {
    delete process.env.DISCORD_WEBHOOK_URL;
  });

  afterEach(() => {
    if (originalWebhookUrl === undefined) {
      delete process.env.DISCORD_WEBHOOK_URL;
    } else {
      process.env.DISCORD_WEBHOOK_URL = originalWebhookUrl;
    }
    global.fetch = originalFetch;
  });

  it("reports not sent without a DISCORD_WEBHOOK_URL, without calling fetch", async () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as never;

    const result = await postDiscordReport("hello");

    expect(result).toEqual({
      sent: false,
      reason: "DISCORD_WEBHOOK_URL이 설정되어 있지 않습니다.",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("posts the message as JSON content to the configured webhook", async () => {
    process.env.DISCORD_WEBHOOK_URL = "https://discord.example/webhook";
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchSpy as never;

    const result = await postDiscordReport("db is down");

    expect(result).toEqual({ sent: true });
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://discord.example/webhook",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ content: "db is down" }),
      }),
    );
  });

  it("reports not sent when the webhook responds with an error status", async () => {
    process.env.DISCORD_WEBHOOK_URL = "https://discord.example/webhook";
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 }) as never;

    const result = await postDiscordReport("hello");

    expect(result.sent).toBe(false);
    if (!result.sent) {
      expect(result.reason).toContain("404");
    }
  });

  it("reports not sent instead of throwing when fetch itself fails", async () => {
    process.env.DISCORD_WEBHOOK_URL = "https://discord.example/webhook";
    global.fetch = vi.fn().mockRejectedValue(new Error("network down")) as never;

    const result = await postDiscordReport("hello");

    expect(result).toEqual({ sent: false, reason: "network down" });
  });
});
