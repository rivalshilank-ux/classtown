import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { mockGetUser, mockInsert, mockUpdate, mockEq, mockSingle, mockFrom, mockRecordAuditLog } =
  vi.hoisted(() => {
    const mockSingle = vi.fn();
    const mockSelectAfterInsert = vi.fn(() => ({ single: mockSingle }));
    const mockInsert = vi.fn(() => ({ select: mockSelectAfterInsert }));
    const mockEq = vi.fn();
    const mockUpdate = vi.fn(() => ({ eq: mockEq }));
    return {
      mockGetUser: vi.fn(),
      mockInsert,
      mockUpdate,
      mockEq,
      mockSingle,
      mockFrom: vi.fn(() => ({ insert: mockInsert, update: mockUpdate })),
      mockRecordAuditLog: vi.fn(),
    };
  });

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(() =>
    Promise.resolve({ auth: { getUser: mockGetUser }, from: mockFrom }),
  ),
}));

vi.mock("@/lib/admin/audit", () => ({
  recordAuditLog: mockRecordAuditLog,
}));

import { createAnnouncementDraft, expireAnnouncement, publishAnnouncement } from "./announcementActions";

describe("createAnnouncementDraft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid input without touching supabase", async () => {
    const result = await createAnnouncementDraft({ title: "", body: "" });
    expect(result.success).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("rejects a title or body over the length limit", async () => {
    const result = await createAnnouncementDraft({ title: "a".repeat(101), body: "ok" });
    expect(result.success).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("creates a draft owned by the current admin and logs it", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1" } } });
    mockSingle.mockResolvedValue({ data: { id: "ann-1" }, error: null });

    const result = await createAnnouncementDraft({ title: "점검 안내", body: "내용입니다" });

    expect(result).toEqual({ success: true, data: { id: "ann-1" } });
    expect(mockInsert).toHaveBeenCalledWith({
      title: "점검 안내",
      body: "내용입니다",
      created_by: "admin-1",
    });
    expect(mockRecordAuditLog).toHaveBeenCalledWith({
      action: "announcement.create",
      targetType: "announcement",
      targetId: "ann-1",
      riskLevel: "low",
      actorType: "admin",
    });
  });

  it("fails without an authenticated session, without logging anything", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const result = await createAnnouncementDraft({ title: "t", body: "b" });
    expect(result.success).toBe(false);
    expect(mockRecordAuditLog).not.toHaveBeenCalled();
  });
});

describe("publishAnnouncement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("publishes and logs at medium risk", async () => {
    mockEq.mockResolvedValue({ error: null });

    const result = await publishAnnouncement("ann-1");

    expect(result).toEqual({ success: true, data: null });
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: "published" }),
    );
    expect(mockEq).toHaveBeenCalledWith("id", "ann-1");
    expect(mockRecordAuditLog).toHaveBeenCalledWith({
      action: "announcement.publish",
      targetType: "announcement",
      targetId: "ann-1",
      riskLevel: "medium",
    });
  });

  it("rejects a non-string id without touching supabase", async () => {
    const result = await publishAnnouncement(123);
    expect(result.success).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe("expireAnnouncement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("expires and logs at low risk", async () => {
    mockEq.mockResolvedValue({ error: null });

    const result = await expireAnnouncement("ann-1");

    expect(result).toEqual({ success: true, data: null });
    expect(mockUpdate).toHaveBeenCalledWith({ status: "expired" });
    expect(mockRecordAuditLog).toHaveBeenCalledWith({
      action: "announcement.expire",
      targetType: "announcement",
      targetId: "ann-1",
      riskLevel: "low",
    });
  });
});
