import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  archiveClass,
  createClass,
  createRosterParticipant,
  regenerateClassCode,
  removeParticipant,
  renameClass,
  sendAnnouncement,
  setClassJoinMode,
  setClassJoinOpen,
} from "./teacherActions";

// vi.mock calls are hoisted above every other top-level statement -- with
// more than one in a file, the mocked variables need vi.hoisted() or the
// factory below runs before its `const` initializer does (a TDZ error).
const {
  mockRpc,
  mockEq,
  mockUpdate,
  mockParticipantsEq,
  mockParticipantsUpdate,
  mockParticipantsMaybeSingle,
  mockAnnouncementInsert,
  mockFrom,
  mockGetActiveMaintenanceNotice,
} = vi.hoisted(() => {
  const mockEq = vi.fn();
  const mockUpdate = vi.fn((_payload: Record<string, unknown>) => ({ eq: mockEq }));

  const mockParticipantsMaybeSingle = vi.fn();
  const mockParticipantsSelect = vi.fn(() => ({ maybeSingle: mockParticipantsMaybeSingle }));
  const mockParticipantsEq = vi.fn(() => ({ select: mockParticipantsSelect }));
  const mockParticipantsUpdate = vi.fn((_payload: Record<string, unknown>) => ({
    eq: mockParticipantsEq,
  }));

  const mockAnnouncementInsert = vi.fn();

  return {
    mockRpc: vi.fn(),
    mockEq,
    mockUpdate,
    mockParticipantsEq,
    mockParticipantsUpdate,
    mockParticipantsMaybeSingle,
    mockAnnouncementInsert,
    // "classes" keeps the original update->eq shape every existing test
    // relies on; "student_participants" (removeParticipant) also chains
    // select().maybeSingle() after eq(); "class_announcements"
    // (sendAnnouncement) is a bare insert with no further chaining.
    mockFrom: vi.fn((table: string) => {
      if (table === "student_participants") {
        return { update: mockParticipantsUpdate };
      }
      if (table === "class_announcements") {
        return { insert: mockAnnouncementInsert };
      }
      return { update: mockUpdate };
    }),
    mockGetActiveMaintenanceNotice: vi.fn(),
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(() =>
    Promise.resolve({ rpc: mockRpc, from: mockFrom }),
  ),
}));

vi.mock("@/lib/site/maintenance", () => ({
  getActiveMaintenanceNotice: mockGetActiveMaintenanceNotice,
}));

beforeEach(() => {
  mockGetActiveMaintenanceNotice.mockResolvedValue(null);
});

const GENERIC = "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
const NAME_ERROR = "학급 이름을 확인해 주세요.";
const MAINTENANCE_ACTIVE = { message: "점검 중", startsAt: "2026-01-01T00:00:00Z" };

const CLASS_ROW = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "5-A",
  class_code: "ABC234",
  join_mode: "open" as const,
  join_open: true,
  archived_at: null,
  created_at: "2026-09-05T00:00:00.000Z",
};

describe("createClass", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects an invalid name without calling supabase", async () => {
    const result = await createClass("");

    expect(result).toEqual({ success: false, error: NAME_ERROR });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("calls create_class with only the name -- ownership comes from auth.uid(), never a client-supplied teacher id", async () => {
    mockRpc.mockResolvedValue({ data: CLASS_ROW, error: null });

    await createClass("5-A");

    expect(mockRpc).toHaveBeenCalledWith("create_class", { p_name: "5-A" });
  });

  it("maps a successful row into a ClassRecord for an authenticated teacher", async () => {
    mockRpc.mockResolvedValue({ data: CLASS_ROW, error: null });

    const result = await createClass("5-A");

    expect(result).toEqual({
      success: true,
      data: {
        id: CLASS_ROW.id,
        name: CLASS_ROW.name,
        classCode: CLASS_ROW.class_code,
        joinMode: CLASS_ROW.join_mode,
        joinOpen: CLASS_ROW.join_open,
        archivedAt: CLASS_ROW.archived_at,
        createdAt: CLASS_ROW.created_at,
      },
    });
  });

  it("never leaks the database error to the caller (e.g. an unauthenticated or non-teacher rejection from the RPC)", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "not a teacher", code: "42501" },
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await createClass("5-A");

    expect(result).toEqual({ success: false, error: GENERIC });
    expect(JSON.stringify(result)).not.toContain("not a teacher");
    consoleSpy.mockRestore();
  });

  it("logs the underlying RPC error server-side so a real failure isn't silent", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "function create_class(text) does not exist" },
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await createClass("5-A");

    expect(consoleSpy).toHaveBeenCalledWith(
      "create_class failed:",
      "function create_class(text) does not exist",
    );
    consoleSpy.mockRestore();
  });

  it("treats a missing row (no error, but no data) as a failure instead of throwing", async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await createClass("5-A");

    expect(result).toEqual({ success: false, error: GENERIC });
    consoleSpy.mockRestore();
  });

  it("blocks class creation with a server-authoritative check when maintenance is active", async () => {
    mockGetActiveMaintenanceNotice.mockResolvedValue(MAINTENANCE_ACTIVE);

    const result = await createClass("5-A");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("MAINTENANCE_MODE");
    }
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

describe("regenerateClassCode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a non-string class id without calling supabase", async () => {
    const result = await regenerateClassCode(123);

    expect(result).toEqual({ success: false, error: GENERIC });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("returns the new code on success", async () => {
    mockRpc.mockResolvedValue({ data: "XYZ789", error: null });

    const result = await regenerateClassCode(CLASS_ROW.id);

    expect(result).toEqual({ success: true, data: "XYZ789" });
    expect(mockRpc).toHaveBeenCalledWith("regenerate_class_code", {
      p_class_id: CLASS_ROW.id,
    });
  });

  it("does not leak a database error (e.g. a class owned by another teacher)", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "not your class" },
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await regenerateClassCode(CLASS_ROW.id);

    expect(result).toEqual({ success: false, error: GENERIC });
    consoleSpy.mockRestore();
  });

  it("blocks regenerating a code during maintenance", async () => {
    mockGetActiveMaintenanceNotice.mockResolvedValue(MAINTENANCE_ACTIVE);
    const result = await regenerateClassCode(CLASS_ROW.id);
    expect(result.success).toBe(false);
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

describe("archiveClass", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a non-string class id without calling supabase", async () => {
    const result = await archiveClass(null);

    expect(result).toEqual({ success: false, error: GENERIC });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("archives on success", async () => {
    mockEq.mockResolvedValue({ error: null });

    const result = await archiveClass(CLASS_ROW.id);

    expect(result).toEqual({ success: true, data: null });
    expect(mockFrom).toHaveBeenCalledWith("classes");
    expect(mockUpdate.mock.calls).toHaveLength(1);
    const updatePayload = mockUpdate.mock.calls[0]![0];
    expect(typeof updatePayload.archived_at).toBe("string");
    expect(new Date(updatePayload.archived_at as string).toString()).not.toBe(
      "Invalid Date",
    );
    expect(mockEq).toHaveBeenCalledWith("id", CLASS_ROW.id);
  });

  it("does not leak a database error", async () => {
    mockEq.mockResolvedValue({ error: { message: "permission denied" } });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await archiveClass(CLASS_ROW.id);

    expect(result).toEqual({ success: false, error: GENERIC });
    consoleSpy.mockRestore();
  });

  it("blocks archiving a class during maintenance", async () => {
    mockGetActiveMaintenanceNotice.mockResolvedValue(MAINTENANCE_ACTIVE);
    const result = await archiveClass(CLASS_ROW.id);
    expect(result.success).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe("setClassJoinOpen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a non-boolean joinOpen without calling supabase", async () => {
    const result = await setClassJoinOpen(CLASS_ROW.id, "true");

    expect(result).toEqual({ success: false, error: GENERIC });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("updates join_open on success", async () => {
    mockEq.mockResolvedValue({ error: null });

    const result = await setClassJoinOpen(CLASS_ROW.id, false);

    expect(result).toEqual({ success: true, data: null });
    expect(mockUpdate).toHaveBeenCalledWith({ join_open: false });
  });

  it("blocks toggling join_open during maintenance", async () => {
    mockGetActiveMaintenanceNotice.mockResolvedValue(MAINTENANCE_ACTIVE);
    const result = await setClassJoinOpen(CLASS_ROW.id, false);
    expect(result.success).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe("setClassJoinMode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a joinMode that isn't 'open' or 'roster' without calling supabase", async () => {
    const result = await setClassJoinMode(CLASS_ROW.id, "invited");

    expect(result).toEqual({ success: false, error: GENERIC });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("rejects a non-string class id without calling supabase", async () => {
    const result = await setClassJoinMode(42, "roster");

    expect(result).toEqual({ success: false, error: GENERIC });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("updates join_mode on success", async () => {
    mockEq.mockResolvedValue({ error: null });

    const result = await setClassJoinMode(CLASS_ROW.id, "roster");

    expect(result).toEqual({ success: true, data: null });
    expect(mockFrom).toHaveBeenCalledWith("classes");
    expect(mockUpdate).toHaveBeenCalledWith({ join_mode: "roster" });
    expect(mockEq).toHaveBeenCalledWith("id", CLASS_ROW.id);
  });

  it("does not leak a database error", async () => {
    mockEq.mockResolvedValue({ error: { message: "permission denied" } });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await setClassJoinMode(CLASS_ROW.id, "roster");

    expect(result).toEqual({ success: false, error: GENERIC });
    consoleSpy.mockRestore();
  });

  it("blocks changing join mode during maintenance", async () => {
    mockGetActiveMaintenanceNotice.mockResolvedValue(MAINTENANCE_ACTIVE);
    const result = await setClassJoinMode(CLASS_ROW.id, "roster");
    expect(result.success).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe("createRosterParticipant", () => {
  const PARTICIPANT_ROW = {
    id: "44444444-4444-4444-8444-444444444444",
    nickname: "김민준",
    participant_code: "XYZ789",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a non-string class id without calling supabase", async () => {
    const result = await createRosterParticipant(123, "김민준");

    expect(result).toEqual({ success: false, error: GENERIC });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("rejects an invalid nickname without calling supabase", async () => {
    const result = await createRosterParticipant(CLASS_ROW.id, "");

    expect(result.success).toBe(false);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("calls create_roster_participant with the class id and trimmed nickname", async () => {
    mockRpc.mockResolvedValue({ data: PARTICIPANT_ROW, error: null });

    await createRosterParticipant(CLASS_ROW.id, "김민준");

    expect(mockRpc).toHaveBeenCalledWith("create_roster_participant", {
      p_class_id: CLASS_ROW.id,
      p_nickname: "김민준",
    });
  });

  it("maps a successful row into a RosterParticipant", async () => {
    mockRpc.mockResolvedValue({ data: PARTICIPANT_ROW, error: null });

    const result = await createRosterParticipant(CLASS_ROW.id, "김민준");

    expect(result).toEqual({
      success: true,
      data: {
        id: PARTICIPANT_ROW.id,
        nickname: PARTICIPANT_ROW.nickname,
        participantCode: PARTICIPANT_ROW.participant_code,
      },
    });
  });

  it("never leaks the database error to the caller (e.g. a class owned by another teacher)", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "not your class" },
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await createRosterParticipant(CLASS_ROW.id, "김민준");

    expect(result).toEqual({ success: false, error: GENERIC });
    consoleSpy.mockRestore();
  });

  it("blocks creating a roster participant during maintenance", async () => {
    mockGetActiveMaintenanceNotice.mockResolvedValue(MAINTENANCE_ACTIVE);
    const result = await createRosterParticipant(CLASS_ROW.id, "김민준");
    expect(result.success).toBe(false);
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

describe("sendAnnouncement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a non-string class id without calling supabase", async () => {
    const result = await sendAnnouncement(123, "쉬는 시간입니다");

    expect(result).toEqual({ success: false, error: GENERIC });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("rejects an empty message without calling supabase", async () => {
    const result = await sendAnnouncement(CLASS_ROW.id, "   ");

    expect(result.success).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("rejects a message over the length limit without calling supabase", async () => {
    const result = await sendAnnouncement(CLASS_ROW.id, "a".repeat(281));

    expect(result.success).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("inserts a trimmed message scoped to the class on success", async () => {
    mockAnnouncementInsert.mockResolvedValue({ error: null });

    const result = await sendAnnouncement(CLASS_ROW.id, "  쉬는 시간입니다  ");

    expect(result).toEqual({ success: true, data: null });
    expect(mockFrom).toHaveBeenCalledWith("class_announcements");
    expect(mockAnnouncementInsert).toHaveBeenCalledWith({
      class_id: CLASS_ROW.id,
      message: "쉬는 시간입니다",
    });
  });

  it("never leaks a database error (e.g. a class owned by another teacher)", async () => {
    mockAnnouncementInsert.mockResolvedValue({
      error: { message: "new row violates row-level security policy" },
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await sendAnnouncement(CLASS_ROW.id, "쉬는 시간입니다");

    expect(result).toEqual({ success: false, error: GENERIC });
    consoleSpy.mockRestore();
  });

  it("blocks sending an announcement during maintenance", async () => {
    mockGetActiveMaintenanceNotice.mockResolvedValue(MAINTENANCE_ACTIVE);
    const result = await sendAnnouncement(CLASS_ROW.id, "쉬는 시간입니다");
    expect(result.success).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe("renameClass", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a non-string class id without calling supabase", async () => {
    const result = await renameClass(123, "5-B");

    expect(result).toEqual({ success: false, error: GENERIC });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("rejects an invalid name without calling supabase", async () => {
    const result = await renameClass(CLASS_ROW.id, "");

    expect(result).toEqual({ success: false, error: NAME_ERROR });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("renames on success, relying on RLS (not a client teacher id) for ownership", async () => {
    mockEq.mockResolvedValue({ error: null });

    const result = await renameClass(CLASS_ROW.id, "5-B");

    expect(result).toEqual({ success: true, data: null });
    expect(mockFrom).toHaveBeenCalledWith("classes");
    expect(mockUpdate).toHaveBeenCalledWith({ name: "5-B" });
    expect(mockEq).toHaveBeenCalledWith("id", CLASS_ROW.id);
  });

  it("does not leak a database error (e.g. a class owned by another teacher)", async () => {
    mockEq.mockResolvedValue({ error: { message: "permission denied" } });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await renameClass(CLASS_ROW.id, "5-B");

    expect(result).toEqual({ success: false, error: GENERIC });
    consoleSpy.mockRestore();
  });

  it("blocks renaming during maintenance", async () => {
    mockGetActiveMaintenanceNotice.mockResolvedValue(MAINTENANCE_ACTIVE);
    const result = await renameClass(CLASS_ROW.id, "5-B");
    expect(result.success).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe("removeParticipant", () => {
  const PARTICIPANT_ID = "33333333-3333-4333-8333-333333333333";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a non-string participant id without calling supabase", async () => {
    const result = await removeParticipant(null);

    expect(result).toEqual({ success: false, error: GENERIC });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("sets status to removed on success", async () => {
    mockParticipantsMaybeSingle.mockResolvedValue({ data: { id: PARTICIPANT_ID }, error: null });

    const result = await removeParticipant(PARTICIPANT_ID);

    expect(result).toEqual({ success: true, data: null });
    expect(mockFrom).toHaveBeenCalledWith("student_participants");
    expect(mockParticipantsUpdate).toHaveBeenCalledWith({ status: "removed" });
    expect(mockParticipantsEq).toHaveBeenCalledWith("id", PARTICIPANT_ID);
  });

  it("fails without leaking a database error", async () => {
    mockParticipantsMaybeSingle.mockResolvedValue({
      data: null,
      error: { message: "permission denied" },
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await removeParticipant(PARTICIPANT_ID);

    expect(result).toEqual({ success: false, error: GENERIC });
    consoleSpy.mockRestore();
  });

  it("reports failure when RLS matches no row (a participant from another teacher's class, IDOR)", async () => {
    mockParticipantsMaybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await removeParticipant(PARTICIPANT_ID);

    expect(result).toEqual({ success: false, error: GENERIC });
  });

  it("blocks removal during maintenance", async () => {
    mockGetActiveMaintenanceNotice.mockResolvedValue(MAINTENANCE_ACTIVE);
    const result = await removeParticipant(PARTICIPANT_ID);
    expect(result.success).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
