import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockAcquireSchedulerLock, mockFinishSchedulerRun, mockCreateSystemUpdatePlan } = vi.hoisted(
  () => ({
    mockAcquireSchedulerLock: vi.fn(),
    mockFinishSchedulerRun: vi.fn(),
    mockCreateSystemUpdatePlan: vi.fn(),
  }),
);

vi.mock("@/lib/deploy/schedulerLock", () => ({
  acquireSchedulerLock: mockAcquireSchedulerLock,
  currentRunKey: () => "2026-09-13",
  finishSchedulerRun: mockFinishSchedulerRun,
}));

vi.mock("@/lib/deploy/updatePlans", () => ({
  createSystemUpdatePlan: mockCreateSystemUpdatePlan,
}));

import { GET } from "./route";

const originalSecret = process.env.CRON_SECRET;

function request(authHeader?: string) {
  return new NextRequest("http://localhost/api/cron/weekly-check", {
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

describe("GET /api/cron/weekly-check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "real-secret";
    mockAcquireSchedulerLock.mockResolvedValue(true);
    mockCreateSystemUpdatePlan.mockResolvedValue({ id: "plan-1" });
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
  });

  it("rejects a wrong secret", async () => {
    const response = await GET(request("Bearer wrong"));
    expect(response.status).toBe(401);
    expect(mockAcquireSchedulerLock).not.toHaveBeenCalled();
  });

  it("accepts the correct secret and creates a plan", async () => {
    const response = await GET(request("Bearer real-secret"));
    const body: unknown = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ status: "created", planId: "plan-1" });
    expect(mockFinishSchedulerRun).toHaveBeenCalledWith("weekly-check", "2026-09-13", "completed");
  });

  it("does not create a plan when the lock is already held (another invocation owns this run)", async () => {
    mockAcquireSchedulerLock.mockResolvedValue(false);

    const response = await GET(request("Bearer real-secret"));
    const body: unknown = await response.json();

    expect(body).toEqual({ status: "already run this week" });
    expect(mockCreateSystemUpdatePlan).not.toHaveBeenCalled();
  });
});
