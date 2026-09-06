import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

interface QueryResult {
  data: unknown;
  count?: number | null;
  error?: unknown;
}

function createQueryStub(getResult: () => QueryResult) {
  const methods = ["select", "ilike", "eq", "is", "not", "in", "order", "range"] as const;
  const stub: Record<string, unknown> = {};
  for (const method of methods) {
    stub[method] = vi.fn(() => stub);
  }
  stub.then = (onFulfilled: (value: QueryResult) => unknown, onRejected?: (reason: unknown) => unknown) =>
    Promise.resolve(getResult()).then(onFulfilled, onRejected);
  return stub;
}

let results: Record<string, QueryResult>;
let stubs: Record<string, ReturnType<typeof createQueryStub>>;

const mockFrom = vi.fn((table: string) => {
  stubs[table] ??= createQueryStub(() => results[table] ?? { data: [], count: 0, error: null });
  return stubs[table];
});

function getStub(table: string): ReturnType<typeof createQueryStub> {
  const stub = stubs[table];
  if (!stub) {
    throw new Error(`table "${table}" was never queried`);
  }
  return stub;
}

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(() => Promise.resolve({ from: mockFrom })),
}));

import { listClasses, CLASSES_PAGE_SIZE } from "./classes";

const CLASS_ROW = {
  id: "c1",
  name: "1반",
  class_code: "AB23CD",
  teacher_id: "t1",
  archived_at: null,
  created_at: "2026-01-01T00:00:00Z",
};

describe("listClasses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    results = {};
    stubs = {};
  });

  it("lists classes with teacher name/school and an active student count, showing the full class code", async () => {
    results.classes = { data: [CLASS_ROW], count: 1, error: null };
    results.teacher_accounts = { data: [{ id: "t1", name: "김선생", school_name: "학교1" }] };
    results.student_participants = { data: [{ class_id: "c1" }, { class_id: "c1" }] };

    const result = await listClasses();

    expect(result).toEqual({
      items: [
        {
          id: "c1",
          name: "1반",
          classCode: "AB23CD",
          teacherName: "김선생",
          teacherSchool: "학교1",
          status: "active",
          studentCount: 2,
          createdAt: "2026-01-01T00:00:00Z",
        },
      ],
      total: 1,
    });
  });

  it("marks a class archived when archived_at is set", async () => {
    results.classes = {
      data: [{ ...CLASS_ROW, archived_at: "2026-02-01T00:00:00Z" }],
      count: 1,
      error: null,
    };
    results.teacher_accounts = { data: [{ id: "t1", name: "김선생", school_name: "학교1" }] };
    results.student_participants = { data: [] };

    const result = await listClasses();

    expect(result.items[0]?.status).toBe("archived");
    expect(result.items[0]?.studentCount).toBe(0);
  });

  it("falls back to a placeholder when the owning teacher can't be resolved", async () => {
    results.classes = { data: [CLASS_ROW], count: 1, error: null };
    results.teacher_accounts = { data: [] };
    results.student_participants = { data: [] };

    const result = await listClasses();

    expect(result.items[0]?.teacherName).toBe("(알 수 없음)");
  });

  it("filters to active classes only when requested", async () => {
    results.classes = { data: [], count: 0, error: null };
    await listClasses({ status: "active" });
    expect(getStub("classes").is).toHaveBeenCalledWith("archived_at", null);
    expect(getStub("classes").not).not.toHaveBeenCalled();
  });

  it("filters to archived classes only when requested", async () => {
    results.classes = { data: [], count: 0, error: null };
    await listClasses({ status: "archived" });
    expect(getStub("classes").not).toHaveBeenCalledWith("archived_at", "is", null);
    expect(getStub("classes").is).not.toHaveBeenCalled();
  });

  it("applies a search filter on class name when provided", async () => {
    results.classes = { data: [], count: 0, error: null };
    await listClasses({ search: "1반" });
    expect(getStub("classes").ilike).toHaveBeenCalledWith("name", "%1반%");
  });

  it("paginates using CLASSES_PAGE_SIZE", async () => {
    results.classes = { data: [], count: 0, error: null };
    await listClasses({ page: 3 });
    expect(getStub("classes").range).toHaveBeenCalledWith(
      CLASSES_PAGE_SIZE * 2,
      CLASSES_PAGE_SIZE * 3 - 1,
    );
  });

  it("returns an empty page instead of throwing on a query error", async () => {
    results.classes = { data: null, count: null, error: { message: "boom" } };
    const result = await listClasses();
    expect(result).toEqual({ items: [], total: 0 });
  });
});
