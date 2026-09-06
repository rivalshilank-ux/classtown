import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}));

import { proxy } from "./proxy";

describe("proxy route protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  });

  it("redirects an unauthenticated request away from /teacher", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const request = new NextRequest("http://localhost/teacher");
    const response = await proxy(request);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("allows an authenticated request to /teacher through", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    const request = new NextRequest("http://localhost/teacher");
    const response = await proxy(request);
    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects an already-authenticated user away from /login", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    const request = new NextRequest("http://localhost/login");
    const response = await proxy(request);
    expect(response.headers.get("location")).toContain("/teacher");
  });

  it("redirects an already-authenticated user away from /signup", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    const request = new NextRequest("http://localhost/signup");
    const response = await proxy(request);
    expect(response.headers.get("location")).toContain("/teacher");
  });

  it("leaves public routes alone for an unauthenticated visitor", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const request = new NextRequest("http://localhost/");
    const response = await proxy(request);
    expect(response.headers.get("location")).toBeNull();
  });

  it("leaves the login page alone for an unauthenticated visitor", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const request = new NextRequest("http://localhost/login");
    const response = await proxy(request);
    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects an unauthenticated request away from /admin", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const request = new NextRequest("http://localhost/admin");
    const response = await proxy(request);
    expect(response.headers.get("location")).toContain("/admin/login");
  });

  it("allows an authenticated request to /admin through (admin-ness is checked in the layout)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    const request = new NextRequest("http://localhost/admin");
    const response = await proxy(request);
    expect(response.headers.get("location")).toBeNull();
  });

  it("leaves /admin/login reachable for an unauthenticated visitor", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const request = new NextRequest("http://localhost/admin/login");
    const response = await proxy(request);
    expect(response.headers.get("location")).toBeNull();
  });

  it("does not redirect an authenticated session away from /admin/login (teacher vs admin is resolved by the page itself)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    const request = new NextRequest("http://localhost/admin/login");
    const response = await proxy(request);
    expect(response.headers.get("location")).toBeNull();
  });

  describe.each([
    "/admin/teachers",
    "/admin/classes",
    "/admin/students",
    "/admin/audit",
    "/admin/announcements",
    "/admin/system",
  ])("admin sub-route %s", (path) => {
    it("redirects an unauthenticated request (this covers a student session too -- students never hold a Supabase session at all)", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });
      const request = new NextRequest(`http://localhost${path}`);
      const response = await proxy(request);
      expect(response.headers.get("location")).toContain("/admin/login");
    });

    it("lets any authenticated session through the proxy layer (a teacher session is rejected next by getCurrentAdmin() in the layout, not here)", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "teacher-1" } } });
      const request = new NextRequest(`http://localhost${path}`);
      const response = await proxy(request);
      expect(response.headers.get("location")).toBeNull();
    });
  });
});
