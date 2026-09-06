import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockRange = vi.fn();
const mockOrder = vi.fn(() => ({ range: mockRange }));
const mockSelect = vi.fn(() => ({ order: mockOrder }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(() => Promise.resolve({ from: mockFrom })),
}));

import { listAnnouncements, ANNOUNCEMENTS_PAGE_SIZE } from "./announcements";

describe("listAnnouncements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps every status, not just published", async () => {
    mockRange.mockResolvedValue({
      data: [
        {
          id: "a1",
          title: "제목",
          body: "내용",
          status: "draft",
          scheduled_at: null,
          published_at: null,
          expires_at: null,
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
      count: 1,
      error: null,
    });

    const result = await listAnnouncements();

    expect(mockFrom).toHaveBeenCalledWith("system_announcements");
    expect(result).toEqual({
      items: [
        {
          id: "a1",
          title: "제목",
          body: "내용",
          status: "draft",
          scheduledAt: null,
          publishedAt: null,
          expiresAt: null,
          createdAt: "2026-01-01T00:00:00Z",
        },
      ],
      total: 1,
    });
  });

  it("paginates using ANNOUNCEMENTS_PAGE_SIZE", async () => {
    mockRange.mockResolvedValue({ data: [], count: 0, error: null });
    await listAnnouncements(2);
    expect(mockRange).toHaveBeenCalledWith(
      ANNOUNCEMENTS_PAGE_SIZE,
      ANNOUNCEMENTS_PAGE_SIZE * 2 - 1,
    );
  });

  it("returns an empty page instead of throwing on a query error", async () => {
    mockRange.mockResolvedValue({ data: null, count: null, error: { message: "boom" } });
    const result = await listAnnouncements();
    expect(result).toEqual({ items: [], total: 0 });
  });
});
