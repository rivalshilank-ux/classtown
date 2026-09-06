import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

import { listStudents, STUDENTS_PAGE_SIZE } from "./students";

const NOW = Date.parse("2026-01-01T00:10:00Z");

const PARTICIPANT_ROW = {
  id: "p1",
  class_id: "c1",
  nickname: "다람쥐",
  status: "active",
  last_seen_at: new Date(NOW - 30_000).toISOString(),
};

describe("listStudents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    results = {};
    stubs = {};
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("lists students with class name and progression, marking a recently-seen student online, without exposing participant_code", async () => {
    results.student_participants = { data: [PARTICIPANT_ROW], count: 1, error: null };
    results.student_progression = { data: [{ participant_id: "p1", level: 3, xp: 120 }] };
    results.classes = { data: [{ id: "c1", name: "1반" }] };

    const result = await listStudents();

    expect(result).toEqual({
      items: [
        {
          id: "p1",
          nickname: "다람쥐",
          className: "1반",
          status: "active",
          online: true,
          lastSeenAt: PARTICIPANT_ROW.last_seen_at,
          level: 3,
          xp: 120,
        },
      ],
      total: 1,
    });
    expect(getStub("student_participants").select).toHaveBeenCalledWith(
      "id, class_id, nickname, status, last_seen_at",
      { count: "exact" },
    );
  });

  it("defaults to level 1 / xp 0 when no progression row is found", async () => {
    results.student_participants = { data: [PARTICIPANT_ROW], count: 1, error: null };
    results.student_progression = { data: [] };
    results.classes = { data: [{ id: "c1", name: "1반" }] };

    const result = await listStudents();

    expect(result.items[0]?.level).toBe(1);
    expect(result.items[0]?.xp).toBe(0);
  });

  it("marks a student seen more than the online window ago as offline", async () => {
    results.student_participants = {
      data: [{ ...PARTICIPANT_ROW, last_seen_at: new Date(NOW - 10 * 60_000).toISOString() }],
      count: 1,
      error: null,
    };
    results.student_progression = { data: [] };
    results.classes = { data: [{ id: "c1", name: "1반" }] };

    const result = await listStudents();

    expect(result.items[0]?.online).toBe(false);
  });

  it("filters by status when requested", async () => {
    results.student_participants = { data: [], count: 0, error: null };
    await listStudents({ status: "removed" });
    expect(getStub("student_participants").eq).toHaveBeenCalledWith("status", "removed");
  });

  it("filters by class when a classId is given", async () => {
    results.student_participants = { data: [], count: 0, error: null };
    await listStudents({ classId: "c1" });
    expect(getStub("student_participants").eq).toHaveBeenCalledWith("class_id", "c1");
  });

  it("applies a search filter on nickname when provided", async () => {
    results.student_participants = { data: [], count: 0, error: null };
    await listStudents({ search: "다람" });
    expect(getStub("student_participants").ilike).toHaveBeenCalledWith("nickname", "%다람%");
  });

  it("paginates using STUDENTS_PAGE_SIZE", async () => {
    results.student_participants = { data: [], count: 0, error: null };
    await listStudents({ page: 2 });
    expect(getStub("student_participants").range).toHaveBeenCalledWith(
      STUDENTS_PAGE_SIZE,
      STUDENTS_PAGE_SIZE * 2 - 1,
    );
  });

  it("returns an empty page instead of throwing on a query error", async () => {
    results.student_participants = { data: null, count: null, error: { message: "boom" } };
    const result = await listStudents();
    expect(result).toEqual({ items: [], total: 0 });
  });
});
