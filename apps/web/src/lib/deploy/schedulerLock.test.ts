import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { mockUpsert, mockSelect, mockEqJob, mockEqRun, mockUpdate, mockFrom } = vi.hoisted(() => {
  const mockSelect = vi.fn();
  const mockUpsert = vi.fn(() => ({ select: mockSelect }));
  const mockEqRun = vi.fn();
  const mockEqJob = vi.fn(() => ({ eq: mockEqRun }));
  const mockUpdate = vi.fn(() => ({ eq: mockEqJob }));
  return {
    mockUpsert,
    mockSelect,
    mockEqJob,
    mockEqRun,
    mockUpdate,
    mockFrom: vi.fn(() => ({ upsert: mockUpsert, update: mockUpdate })),
  };
});

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: vi.fn(() => ({ from: mockFrom })),
}));

import { acquireSchedulerLock, currentRunKey, finishSchedulerRun } from "./schedulerLock";

describe("currentRunKey", () => {
  it("returns a YYYY-MM-DD date string", () => {
    expect(currentRunKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("acquireSchedulerLock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when the upsert actually inserted a row (lock acquired)", async () => {
    mockSelect.mockResolvedValue({ data: [{ job_name: "weekly-check" }], error: null });

    const result = await acquireSchedulerLock("weekly-check", "2026-09-13");

    expect(result).toBe(true);
    expect(mockUpsert).toHaveBeenCalledWith(
      { job_name: "weekly-check", run_key: "2026-09-13", status: "running" },
      { onConflict: "job_name,run_key", ignoreDuplicates: true },
    );
  });

  it("returns false when no row comes back (another invocation already holds the lock)", async () => {
    mockSelect.mockResolvedValue({ data: [], error: null });
    const result = await acquireSchedulerLock("weekly-check", "2026-09-13");
    expect(result).toBe(false);
  });

  it("fails closed (returns false) on a query error rather than assuming the lock was acquired", async () => {
    mockSelect.mockResolvedValue({ data: null, error: { message: "boom" } });
    const result = await acquireSchedulerLock("weekly-check", "2026-09-13");
    expect(result).toBe(false);
  });
});

describe("finishSchedulerRun", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates the exact job/run_key row", async () => {
    mockEqRun.mockResolvedValue({ error: null });

    await finishSchedulerRun("weekly-check", "2026-09-13", "completed");

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: "completed" }),
    );
    expect(mockEqJob).toHaveBeenCalledWith("job_name", "weekly-check");
    expect(mockEqRun).toHaveBeenCalledWith("run_key", "2026-09-13");
  });
});
