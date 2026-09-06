import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

interface QueryResult {
  data?: unknown;
  error?: unknown;
}

/** Every method returns the same stub (works for any chain shape) and the stub is itself thenable, resolving to whatever the test currently has set for that table. */
function createQueryStub(getResult: () => QueryResult) {
  const methods = ["select", "insert", "update", "eq", "order", "limit", "maybeSingle", "single"] as const;
  const stub: Record<string, unknown> = {};
  for (const method of methods) {
    stub[method] = vi.fn(() => stub);
  }
  stub.then = (onFulfilled: (v: QueryResult) => unknown, onRejected?: (e: unknown) => unknown) =>
    Promise.resolve(getResult()).then(onFulfilled, onRejected);
  return stub;
}

let tableResults: Record<string, QueryResult>;
let tableStubs: Record<string, ReturnType<typeof createQueryStub>>;

const mockFrom = vi.fn((table: string) => {
  tableStubs[table] ??= createQueryStub(() => tableResults[table] ?? { data: null, error: null });
  return tableStubs[table];
});

const {
  mockGetOpsConfigForScheduler,
  mockGetLatestApprovedPlan,
  mockGetWorkflowConclusion,
  mockTriggerDeployHook,
  mockGetLatestProductionDeployment,
  mockPromoteDeployment,
  mockEnableSystemMaintenance,
  mockDisableSystemMaintenance,
  mockRecordSystemAuditLog,
} = vi.hoisted(() => ({
  mockGetOpsConfigForScheduler: vi.fn(),
  mockGetLatestApprovedPlan: vi.fn(),
  mockGetWorkflowConclusion: vi.fn(),
  mockTriggerDeployHook: vi.fn(),
  mockGetLatestProductionDeployment: vi.fn(),
  mockPromoteDeployment: vi.fn(),
  mockEnableSystemMaintenance: vi.fn(),
  mockDisableSystemMaintenance: vi.fn(),
  mockRecordSystemAuditLog: vi.fn(),
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/deploy/opsConfig", () => ({
  getOpsConfigForScheduler: mockGetOpsConfigForScheduler,
}));

vi.mock("@/lib/deploy/updatePlans", () => ({
  getLatestApprovedPlan: mockGetLatestApprovedPlan,
}));

vi.mock("@/lib/deploy/github", () => ({
  getWorkflowConclusion: mockGetWorkflowConclusion,
}));

vi.mock("@/lib/deploy/vercel", () => ({
  triggerDeployHook: mockTriggerDeployHook,
  getLatestProductionDeployment: mockGetLatestProductionDeployment,
  promoteDeployment: mockPromoteDeployment,
}));

vi.mock("@/lib/deploy/systemMaintenance", () => ({
  enableSystemMaintenance: mockEnableSystemMaintenance,
  disableSystemMaintenance: mockDisableSystemMaintenance,
  recordSystemAuditLog: mockRecordSystemAuditLog,
}));

import { runWeeklyUpdatePipeline } from "./pipeline";

const ENABLED_CONFIG = {
  autoUpdateEnabled: true,
  autoAnnouncementEnabled: false,
  autoRollbackEnabled: false,
};

describe("runWeeklyUpdatePipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableResults = {};
    tableStubs = {};
    mockEnableSystemMaintenance.mockResolvedValue(true);
    mockDisableSystemMaintenance.mockResolvedValue(true);
    tableResults.update_executions = { data: { id: "exec-1" }, error: null };
  });

  it("skips (no execution row) when auto_update_enabled is false", async () => {
    mockGetOpsConfigForScheduler.mockResolvedValue({ ...ENABLED_CONFIG, autoUpdateEnabled: false });

    const result = await runWeeklyUpdatePipeline();

    expect(result.finalState).toBe("skipped");
    expect(mockGetLatestApprovedPlan).not.toHaveBeenCalled();
  });

  it("skips when ops_config can't be read at all (fails closed, doesn't assume enabled)", async () => {
    mockGetOpsConfigForScheduler.mockResolvedValue(null);
    const result = await runWeeklyUpdatePipeline();
    expect(result.finalState).toBe("skipped");
  });

  it("skips when there is no approved update plan", async () => {
    mockGetOpsConfigForScheduler.mockResolvedValue(ENABLED_CONFIG);
    mockGetLatestApprovedPlan.mockResolvedValue(null);

    const result = await runWeeklyUpdatePipeline();

    expect(result.finalState).toBe("skipped");
    expect(mockGetWorkflowConclusion).not.toHaveBeenCalled();
  });

  it("stops at failed when the precheck (master is not green) fails, and never enables maintenance", async () => {
    mockGetOpsConfigForScheduler.mockResolvedValue(ENABLED_CONFIG);
    mockGetLatestApprovedPlan.mockResolvedValue({ id: "plan-1", summary: "s" });
    mockGetLatestProductionDeployment.mockResolvedValue({ available: false, reason: "not configured" });
    mockGetWorkflowConclusion.mockResolvedValue({ available: true, conclusion: "failure", headSha: "abc" });

    const result = await runWeeklyUpdatePipeline();

    expect(result.finalState).toBe("failed");
    expect(mockEnableSystemMaintenance).not.toHaveBeenCalled();
    expect(mockTriggerDeployHook).not.toHaveBeenCalled();
  });

  it("stops at failed, and disables maintenance again, when the deploy hook call fails", async () => {
    mockGetOpsConfigForScheduler.mockResolvedValue(ENABLED_CONFIG);
    mockGetLatestApprovedPlan.mockResolvedValue({ id: "plan-1", summary: "s" });
    mockGetLatestProductionDeployment.mockResolvedValue({ available: false, reason: "not configured" });
    mockGetWorkflowConclusion.mockResolvedValue({ available: true, conclusion: "success", headSha: "abc" });
    mockTriggerDeployHook.mockResolvedValue({ ok: false, message: "no deploy hook configured" });

    const result = await runWeeklyUpdatePipeline();

    expect(result.finalState).toBe("failed");
    expect(mockEnableSystemMaintenance).toHaveBeenCalledOnce();
    expect(mockDisableSystemMaintenance).toHaveBeenCalledOnce();
  });

  it("stops at failed when verification is not possible (no Vercel API access) -- never assumes success", async () => {
    mockGetOpsConfigForScheduler.mockResolvedValue(ENABLED_CONFIG);
    mockGetLatestApprovedPlan.mockResolvedValue({ id: "plan-1", summary: "s" });
    mockGetWorkflowConclusion.mockResolvedValue({ available: true, conclusion: "success", headSha: "abc" });
    mockTriggerDeployHook.mockResolvedValue({ ok: true });
    // Called twice: once for the checkpoint, once for verification -- not configured both times.
    mockGetLatestProductionDeployment.mockResolvedValue({ available: false, reason: "not configured" });

    const result = await runWeeklyUpdatePipeline();

    expect(result.finalState).toBe("failed");
    expect(mockDisableSystemMaintenance).toHaveBeenCalledOnce();
  });

  it("completes, and disables maintenance, when everything reports healthy", async () => {
    mockGetOpsConfigForScheduler.mockResolvedValue(ENABLED_CONFIG);
    mockGetLatestApprovedPlan.mockResolvedValue({ id: "plan-1", summary: "s" });
    mockGetWorkflowConclusion.mockResolvedValue({ available: true, conclusion: "success", headSha: "abc" });
    mockTriggerDeployHook.mockResolvedValue({ ok: true });
    mockGetLatestProductionDeployment.mockResolvedValue({
      available: true,
      deployment: { id: "dpl_new", readyState: "READY", url: "app.vercel.app" },
    });

    const result = await runWeeklyUpdatePipeline();

    expect(result.finalState).toBe("completed");
    expect(mockDisableSystemMaintenance).toHaveBeenCalledOnce();
  });

  it("does not publish a completion announcement when auto_announcement_enabled is false", async () => {
    mockGetOpsConfigForScheduler.mockResolvedValue(ENABLED_CONFIG);
    mockGetLatestApprovedPlan.mockResolvedValue({ id: "plan-1", summary: "s" });
    mockGetWorkflowConclusion.mockResolvedValue({ available: true, conclusion: "success", headSha: "abc" });
    mockTriggerDeployHook.mockResolvedValue({ ok: true });
    mockGetLatestProductionDeployment.mockResolvedValue({
      available: true,
      deployment: { id: "dpl_new", readyState: "READY", url: "app.vercel.app" },
    });

    await runWeeklyUpdatePipeline();

    expect(mockFrom).not.toHaveBeenCalledWith("system_announcements");
  });

  it("publishes a completion announcement when auto_announcement_enabled is true", async () => {
    mockGetOpsConfigForScheduler.mockResolvedValue({ ...ENABLED_CONFIG, autoAnnouncementEnabled: true });
    mockGetLatestApprovedPlan.mockResolvedValue({ id: "plan-1", summary: "s" });
    mockGetWorkflowConclusion.mockResolvedValue({ available: true, conclusion: "success", headSha: "abc" });
    mockTriggerDeployHook.mockResolvedValue({ ok: true });
    mockGetLatestProductionDeployment.mockResolvedValue({
      available: true,
      deployment: { id: "dpl_new", readyState: "READY", url: "app.vercel.app" },
    });
    tableResults.system_announcements = { data: {}, error: null };

    await runWeeklyUpdatePipeline();

    expect(mockFrom).toHaveBeenCalledWith("system_announcements");
  });

  it("rolls back via the real Vercel promote API when health check fails and auto_rollback_enabled is true", async () => {
    mockGetOpsConfigForScheduler.mockResolvedValue({ ...ENABLED_CONFIG, autoRollbackEnabled: true });
    mockGetLatestApprovedPlan.mockResolvedValue({ id: "plan-1", summary: "s" });
    mockGetWorkflowConclusion.mockResolvedValue({ available: true, conclusion: "success", headSha: "abc" });
    mockTriggerDeployHook.mockResolvedValue({ ok: true });
    // First call = checkpoint (before deploy), second call = post-deploy verification.
    mockGetLatestProductionDeployment
      .mockResolvedValueOnce({ available: true, deployment: { id: "dpl_checkpoint", readyState: "READY", url: "x" } })
      .mockResolvedValueOnce({ available: true, deployment: { id: "dpl_new", readyState: "ERROR", url: "x" } });
    mockPromoteDeployment.mockResolvedValue({ ok: true });

    const result = await runWeeklyUpdatePipeline();

    expect(mockPromoteDeployment).toHaveBeenCalledWith("dpl_checkpoint");
    expect(result.finalState).toBe("rolled_back");
  });

  it("stops at failed (no rollback attempted) when health check fails and auto_rollback_enabled is false", async () => {
    mockGetOpsConfigForScheduler.mockResolvedValue(ENABLED_CONFIG);
    mockGetLatestApprovedPlan.mockResolvedValue({ id: "plan-1", summary: "s" });
    mockGetWorkflowConclusion.mockResolvedValue({ available: true, conclusion: "success", headSha: "abc" });
    mockTriggerDeployHook.mockResolvedValue({ ok: true });
    mockGetLatestProductionDeployment.mockResolvedValue({
      available: true,
      deployment: { id: "dpl_new", readyState: "ERROR", url: "x" },
    });

    const result = await runWeeklyUpdatePipeline();

    expect(mockPromoteDeployment).not.toHaveBeenCalled();
    expect(result.finalState).toBe("failed");
  });
});
