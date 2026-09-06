import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockRpc = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(() => Promise.resolve({ rpc: mockRpc })),
}));

import { getLatestPublishedAnnouncement } from "./announcements";

describe("getLatestPublishedAnnouncement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls the narrow public RPC, not the base table", async () => {
    mockRpc.mockResolvedValue({
      data: [{ id: "ann-1", title: "제목", body: "내용" }],
      error: null,
    });

    const result = await getLatestPublishedAnnouncement();

    expect(mockRpc).toHaveBeenCalledWith("get_latest_published_announcement");
    expect(result).toEqual({ id: "ann-1", title: "제목", body: "내용" });
  });

  it("returns null when nothing is currently published", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    expect(await getLatestPublishedAnnouncement()).toBeNull();
  });

  it("returns null instead of throwing on an RPC error", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    expect(await getLatestPublishedAnnouncement()).toBeNull();
  });
});
