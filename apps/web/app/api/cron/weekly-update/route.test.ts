import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockAcquireSchedulerLock, mockFinishSchedulerRun, mockRunWeeklyUpdatePipeline } = vi.hoisted(
  () => ({
    mockAcquireSchedulerLock: vi.fn(),
    mockFinishSchedulerRun: vi.fn(),
    mockRunWeeklyUpdatePipeline: vi.fn(),
  }),
);

vi.mock("@/lib/deploy/schedulerLock", () => ({
  acquireSchedulerLock: mockAcquireSchedulerLock,
  currentRunKey: () => "2026-09-13",
  finishSchedulerRun: mockFinishSchedulerRun,
}));

vi.mock("@/lib/deploy/pipeline", () => ({
  runWeeklyUpdatePipeline: mockRunWeeklyUpdatePipeline,
}));

import { GET } from "./route";

const originalSecret = process.env.CRON_SECRET;

function request(authHeader?: string) {
  return new NextRequest("http://localhost/api/cron/weekly-update", {
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

describe("GET /api/cron/weekly-update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "real-secret";
    mockAcquireSchedulerLock.mockResolvedValue(true);
    mockRunWeeklyUpdatePipeline.mockResolvedValue({ ranAt: "2026-09-13", finalState: "completed" });
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = originalSecret;
    }
  });

  it("rejects when CRON_SECRET is not configured, even with a matching header (fails closed)", async () => {
    delete process.env.CRON_SECRET;
    const response = await GET(request("Bearer real-secret"));
    expect(response.status).toBe(401);
    expect(mockAcquireSchedulerLock).not.toHaveBeenCalled();
  });

  it("rejects a missing Authorization header", async () => {
    const response = await GET(request());
    expect(response.status).toBe(401);
    expect(mockRunWeeklyUpdatePipeline).not.toHaveBeenCalled();
  });

  it("rejects a wrong secret", async () => {
    const response = await GET(request("Bearer wrong"));
    expect(response.status).toBe(401);
  });

  it("runs the pipeline and reports its final state when the correct secret is used", async () => {
    const response = await GET(request("Bearer real-secret"));
    const body: unknown = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ranAt: "2026-09-13", finalState: "completed" });
    expect(mockFinishSchedulerRun).toHaveBeenCalledWith("weekly-update", "2026-09-13", "completed");
  });

  it("does not run the pipeline when the lock is already held (another invocation owns this run)", async () => {
    mockAcquireSchedulerLock.mockResolvedValue(false);

    const response = await GET(request("Bearer real-secret"));
    const body: unknown = await response.json();

    expect(body).toEqual({ status: "already run this week" });
    expect(mockRunWeeklyUpdatePipeline).not.toHaveBeenCalled();
  });
});
