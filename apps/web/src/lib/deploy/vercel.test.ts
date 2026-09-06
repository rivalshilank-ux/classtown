import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  getDeploymentStatus,
  getLatestProductionDeployment,
  getPreviousProductionDeployment,
  promoteDeployment,
  triggerDeployHook,
} from "./vercel";

const ORIGINALS = {
  VERCEL_TOKEN: process.env.VERCEL_TOKEN,
  VERCEL_PROJECT_ID: process.env.VERCEL_PROJECT_ID,
  VERCEL_DEPLOY_HOOK_URL: process.env.VERCEL_DEPLOY_HOOK_URL,
};
const originalFetch = global.fetch;

function restoreEnv() {
  for (const [key, value] of Object.entries(ORIGINALS)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

describe("Vercel deploy integration", () => {
  beforeEach(() => {
    delete process.env.VERCEL_TOKEN;
    delete process.env.VERCEL_PROJECT_ID;
    delete process.env.VERCEL_DEPLOY_HOOK_URL;
  });

  afterEach(() => {
    restoreEnv();
    global.fetch = originalFetch;
  });

  describe("triggerDeployHook", () => {
    it("reports not configured without a hook URL, without calling fetch", async () => {
      const fetchSpy = vi.fn();
      global.fetch = fetchSpy as never;

      const result = await triggerDeployHook();

      expect(result.ok).toBe(false);
      expect(typeof result.message).toBe("string");
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("POSTs to the real hook URL and reports success", async () => {
      process.env.VERCEL_DEPLOY_HOOK_URL = "https://api.vercel.com/v1/hooks/abc";
      global.fetch = vi.fn().mockResolvedValue({ ok: true }) as never;

      const result = await triggerDeployHook();

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.vercel.com/v1/hooks/abc",
        expect.objectContaining({ method: "POST" }),
      );
      expect(result).toEqual({ ok: true });
    });
  });

  describe("getDeploymentStatus", () => {
    it("reports not available without VERCEL_TOKEN", async () => {
      const result = await getDeploymentStatus("dpl_1");
      expect(result.available).toBe(false);
    });

    it("returns the real ready state", async () => {
      process.env.VERCEL_TOKEN = "token";
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ uid: "dpl_1", readyState: "READY", url: "app.vercel.app" }),
      }) as never;

      const result = await getDeploymentStatus("dpl_1");

      expect(result).toEqual({
        available: true,
        deployment: { id: "dpl_1", readyState: "READY", url: "app.vercel.app" },
      });
    });
  });

  describe("getLatestProductionDeployment / getPreviousProductionDeployment", () => {
    it("reports not available without VERCEL_TOKEN/VERCEL_PROJECT_ID", async () => {
      const latest = await getLatestProductionDeployment();
      const previous = await getPreviousProductionDeployment();
      expect(latest.available).toBe(false);
      expect(previous.available).toBe(false);
    });

    it("getPreviousProductionDeployment returns the second deployment in the list, not the first", async () => {
      process.env.VERCEL_TOKEN = "token";
      process.env.VERCEL_PROJECT_ID = "prj_1";
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            deployments: [
              { uid: "dpl_current", readyState: "READY", url: "current.vercel.app" },
              { uid: "dpl_prev", readyState: "READY", url: "prev.vercel.app" },
            ],
          }),
      }) as never;

      const result = await getPreviousProductionDeployment();

      expect(result).toEqual({
        available: true,
        deployment: { id: "dpl_prev", readyState: "READY", url: "prev.vercel.app" },
      });
    });

    it("getPreviousProductionDeployment reports not available with fewer than two deployments", async () => {
      process.env.VERCEL_TOKEN = "token";
      process.env.VERCEL_PROJECT_ID = "prj_1";
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ deployments: [{ uid: "dpl_only", readyState: "READY", url: "x" }] }),
      }) as never;

      const result = await getPreviousProductionDeployment();

      expect(result.available).toBe(false);
    });
  });

  describe("promoteDeployment", () => {
    it("reports not configured without VERCEL_TOKEN/VERCEL_PROJECT_ID, without calling fetch", async () => {
      const fetchSpy = vi.fn();
      global.fetch = fetchSpy as never;

      const result = await promoteDeployment("dpl_prev");

      expect(result.ok).toBe(false);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("POSTs to the real promote endpoint", async () => {
      process.env.VERCEL_TOKEN = "token";
      process.env.VERCEL_PROJECT_ID = "prj_1";
      global.fetch = vi.fn().mockResolvedValue({ ok: true }) as never;

      const result = await promoteDeployment("dpl_prev");

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.vercel.com/v10/projects/prj_1/promote/dpl_prev",
        expect.objectContaining({ method: "POST" }),
      );
      expect(result).toEqual({ ok: true });
    });
  });
});
