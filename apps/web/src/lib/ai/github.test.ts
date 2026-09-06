import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getRecentCommits } from "./github";

const originalToken = process.env.GITHUB_TOKEN;
const originalFetch = global.fetch;

describe("getRecentCommits", () => {
  beforeEach(() => {
    delete process.env.GITHUB_TOKEN;
  });

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.GITHUB_TOKEN;
    } else {
      process.env.GITHUB_TOKEN = originalToken;
    }
    global.fetch = originalFetch;
  });

  it("reports not available without a GITHUB_TOKEN, without calling fetch", async () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as never;

    const result = await getRecentCommits();

    expect(result.available).toBe(false);
    if (!result.available) {
      expect(result.reason).toContain("GITHUB_TOKEN");
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("maps a successful GitHub API response to recent commits", async () => {
    process.env.GITHUB_TOKEN = "gh-token";
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            sha: "abcdef1234567890",
            commit: {
              message: "fix(web): some bug\n\nlonger body",
              author: { name: "Someone", date: "2026-01-01T00:00:00Z" },
            },
          },
        ]),
    }) as never;

    const result = await getRecentCommits();

    expect(result).toEqual({
      available: true,
      commits: [
        { sha: "abcdef1", message: "fix(web): some bug", author: "Someone", date: "2026-01-01T00:00:00Z" },
      ],
    });
  });

  it("reports not available when the GitHub API responds with an error status", async () => {
    process.env.GITHUB_TOKEN = "gh-token";
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 }) as never;

    const result = await getRecentCommits();

    expect(result.available).toBe(false);
    if (!result.available) {
      expect(result.reason).toContain("401");
    }
  });

  it("reports not available instead of throwing when fetch itself fails", async () => {
    process.env.GITHUB_TOKEN = "gh-token";
    global.fetch = vi.fn().mockRejectedValue(new Error("network down")) as never;

    const result = await getRecentCommits();

    expect(result).toEqual({ available: false, reason: "network down" });
  });
});
