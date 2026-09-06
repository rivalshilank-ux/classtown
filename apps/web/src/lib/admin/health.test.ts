import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockLimit = vi.fn();
const mockEq = vi.fn(() => ({ limit: mockLimit }));
const mockSelect = vi.fn(() => ({ limit: mockLimit, eq: mockEq }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(() => Promise.resolve({ from: mockFrom })),
}));

import { checkDatabaseReachable, getSystemHealthSnapshot } from "./health";

const originalFetch = global.fetch;
const originalGameServerUrl = process.env.NEXT_PUBLIC_GAME_SERVER_URL;

describe("checkDatabaseReachable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when the probe query succeeds", async () => {
    mockLimit.mockResolvedValue({ data: [], error: null });
    expect(await checkDatabaseReachable()).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith("admin_accounts");
  });

  it("returns false when the probe query errors", async () => {
    mockLimit.mockResolvedValue({ data: null, error: { message: "boom" } });
    expect(await checkDatabaseReachable()).toBe(false);
  });
});

describe("getSystemHealthSnapshot", () => {
  afterEach(() => {
    global.fetch = originalFetch;
    process.env.NEXT_PUBLIC_GAME_SERVER_URL = originalGameServerUrl;
  });

  it("reports database down when databaseOk is false, without touching game-server config", async () => {
    delete process.env.NEXT_PUBLIC_GAME_SERVER_URL;
    const result = await getSystemHealthSnapshot(false);
    expect(result.web).toBe("healthy");
    expect(result.auth).toBe("healthy");
    expect(result.database).toBe("down");
    expect(result.gameServer).toBe("unknown");
  });

  it("reports the game server down when the health fetch throws", async () => {
    process.env.NEXT_PUBLIC_GAME_SERVER_URL = "ws://localhost:2567";
    global.fetch = vi.fn().mockRejectedValue(new Error("network error"));

    const result = await getSystemHealthSnapshot(true);

    expect(result.database).toBe("healthy");
    expect(result.gameServer).toBe("down");
  });
});
