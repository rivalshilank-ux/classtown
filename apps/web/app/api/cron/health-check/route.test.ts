import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockAcquireSchedulerLock, mockFinishSchedulerRun, mockRunScheduledHealthReport } = vi.hoisted(
  () => ({
    mockAcquireSchedulerLock: vi.fn(),
    mockFinishSchedulerRun: vi.fn(),
    mockRunScheduledHealthReport: vi.fn(),
  }),
);

vi.mock("@/lib/deploy/schedulerLock", () => ({
  acquireSchedulerLock: mockAcquireSchedulerLock,
  currentRunKey: () => "2026-09-13",
  finishSchedulerRun: mockFinishSchedulerRun,
}));

vi.mock("@/lib/deploy/healthReport", () => ({
  runScheduledHealthReport: mockRunScheduledHealthReport,
}));

import { GET } from "./route";

const originalSecret = process.env.CRON_SECRET;

function request(authHeader?: string) {
  return new NextRequest("http://localhost/api/cron/health-check", {
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

describe("GET /api/cron/health-check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "real-secret";
    mockAcquireSchedulerLock.mockResolvedValue(true);
    mockRunScheduledHealthReport.mockResolvedValue({ outcome: "skipped" });
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

  it("accepts the correct secret and runs the report", async () => {
    mockRunScheduledHealthReport.mockResolvedValue({ outcome: "healthy", gameServer: "healthy" });

    const response = await GET(request("Bearer real-secret"));
    const body: unknown = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ status: "healthy", gameServer: "healthy" });
    expect(mockFinishSchedulerRun).toHaveBeenCalledWith("health-check", "2026-09-13", "healthy");
  });

  it("does not run the report when the lock is already held (another invocation owns today's run)", async () => {
    mockAcquireSchedulerLock.mockResolvedValue(false);

    const response = await GET(request("Bearer real-secret"));
    const body: unknown = await response.json();

    expect(body).toEqual({ status: "already run today" });
    expect(mockRunScheduledHealthReport).not.toHaveBeenCalled();
  });
});
