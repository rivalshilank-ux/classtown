import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getWorkflowConclusion } from "./github";

const originalToken = process.env.GITHUB_TOKEN;
const originalFetch = global.fetch;

describe("getWorkflowConclusion", () => {
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

    const result = await getWorkflowConclusion();

    expect(result.available).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns the latest completed run's conclusion and head sha", async () => {
    process.env.GITHUB_TOKEN = "gh-token";
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          workflow_runs: [{ conclusion: "success", head_sha: "abc123" }],
        }),
    }) as never;

    const result = await getWorkflowConclusion();

    expect(result).toEqual({ available: true, conclusion: "success", headSha: "abc123" });
  });

  it("reports not available when there are no completed runs", async () => {
    process.env.GITHUB_TOKEN = "gh-token";
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ workflow_runs: [] }),
    }) as never;

    const result = await getWorkflowConclusion();

    expect(result.available).toBe(false);
  });

  it("reports not available instead of throwing on a network error", async () => {
    process.env.GITHUB_TOKEN = "gh-token";
    global.fetch = vi.fn().mockRejectedValue(new Error("network down")) as never;

    const result = await getWorkflowConclusion();

    expect(result).toEqual({ available: false, reason: "network down" });
  });
});
