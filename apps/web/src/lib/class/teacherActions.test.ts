import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  archiveClass,
  createClass,
  regenerateClassCode,
  setClassJoinOpen,
} from "./teacherActions";

const mockRpc = vi.fn();
const mockEq = vi.fn();
const mockUpdate = vi.fn((_payload: Record<string, unknown>) => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ update: mockUpdate }));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(() =>
    Promise.resolve({ rpc: mockRpc, from: mockFrom }),
  ),
}));

const GENERIC = "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
const NAME_ERROR = "학급 이름을 확인해 주세요.";

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
});
