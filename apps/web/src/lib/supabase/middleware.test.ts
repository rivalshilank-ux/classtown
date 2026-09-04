import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}));

import { updateSession } from "./middleware";

describe("updateSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  });

  it("returns user: null when there is no session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const request = new NextRequest("http://localhost/teacher");
    const { user } = await updateSession(request);
    expect(user).toBeNull();
  });

  it("returns the authenticated user when there is a session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    const request = new NextRequest("http://localhost/teacher");
    const { user } = await updateSession(request);
    expect(user?.id).toBe("user-1");
  });

  it("throws a clear error instead of silently proceeding when env vars are missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const request = new NextRequest("http://localhost/teacher");
    await expect(updateSession(request)).rejects.toThrow(
      /Missing NEXT_PUBLIC_SUPABASE_URL/,
    );
  });
});
