import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

interface QueryResult {
  data: unknown;
  count?: number | null;
  error?: unknown;
}

/**
 * Every method returns the same stub (so any chain shape the source code
 * uses works without hardcoding call order), and the stub is itself
 * thenable, resolving to whatever the test currently has set for that table
 * -- so `await` works no matter which method happened to be called last.
 */
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

import { listTeachers, TEACHERS_PAGE_SIZE } from "./teachers";

describe("listTeachers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    results = {};
    stubs = {};
  });

  it("lists teachers with a batched class count, without a search filter applied", async () => {
    results.teacher_accounts = {
      data: [
        {
          id: "t1",
          name: "김선생",
          school_name: "학교1",
          email: "t1@example.com",
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
      count: 1,
      error: null,
    };
    results.classes = {
      data: [{ teacher_id: "t1" }, { teacher_id: "t1" }],
    };

    const result = await listTeachers();

    expect(getStub("teacher_accounts").ilike).not.toHaveBeenCalled();
    expect(result).toEqual({
      items: [
        {
          id: "t1",
          name: "김선생",
          schoolName: "학교1",
          email: "t1@example.com",
          classCount: 2,
          createdAt: "2026-01-01T00:00:00Z",
        },
      ],
      total: 1,
    });
  });

  it("applies a search filter on name when provided", async () => {
    results.teacher_accounts = { data: [], count: 0, error: null };
    await listTeachers({ search: "김" });
    expect(getStub("teacher_accounts").ilike).toHaveBeenCalledWith("name", "%김%");
  });

  it("escapes LIKE wildcard characters in the search term", async () => {
    results.teacher_accounts = { data: [], count: 0, error: null };
    await listTeachers({ search: "100%_done" });
    expect(getStub("teacher_accounts").ilike).toHaveBeenCalledWith("name", "%100\\%\\_done%");
  });

  it("paginates using TEACHERS_PAGE_SIZE", async () => {
    results.teacher_accounts = { data: [], count: 0, error: null };
    await listTeachers({ page: 2 });
    expect(getStub("teacher_accounts").range).toHaveBeenCalledWith(
      TEACHERS_PAGE_SIZE,
      TEACHERS_PAGE_SIZE * 2 - 1,
    );
  });

  it("returns an empty page instead of throwing on a query error", async () => {
    results.teacher_accounts = { data: null, count: null, error: { message: "boom" } };
    const result = await listTeachers();
    expect(result).toEqual({ items: [], total: 0 });
    expect(mockFrom).not.toHaveBeenCalledWith("classes");
  });
});
