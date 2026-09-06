import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  mockGetSystemHealthSnapshot,
  mockCheckDatabaseReachable,
  mockListAuditLogs,
  mockCreateAnnouncementDraftCore,
  mockEnableMaintenanceCore,
  mockDisableMaintenanceCore,
  mockGetRecentCommits,
  mockCreateUpdatePlanViaAdmin,
  mockTriggerDeployHook,
  mockGetPreviousProductionDeployment,
  mockPromoteDeployment,
} = vi.hoisted(() => ({
  mockGetSystemHealthSnapshot: vi.fn(),
  mockCheckDatabaseReachable: vi.fn(),
  mockListAuditLogs: vi.fn(),
  mockCreateAnnouncementDraftCore: vi.fn(),
  mockEnableMaintenanceCore: vi.fn(),
  mockDisableMaintenanceCore: vi.fn(),
  mockGetRecentCommits: vi.fn(),
  mockCreateUpdatePlanViaAdmin: vi.fn(),
  mockTriggerDeployHook: vi.fn(),
  mockGetPreviousProductionDeployment: vi.fn(),
  mockPromoteDeployment: vi.fn(),
}));

vi.mock("@/lib/admin/health", () => ({
  getSystemHealthSnapshot: mockGetSystemHealthSnapshot,
  checkDatabaseReachable: mockCheckDatabaseReachable,
}));

vi.mock("@/lib/admin/audit", () => ({
  listAuditLogs: mockListAuditLogs,
}));

vi.mock("@/lib/admin/announcementCore", () => ({
  createAnnouncementDraftCore: mockCreateAnnouncementDraftCore,
  draftSchema: { safeParse: (v: unknown) => ({ success: true, data: v }) },
}));

vi.mock("@/lib/admin/maintenanceCore", () => ({
  enableMaintenanceCore: mockEnableMaintenanceCore,
  disableMaintenanceCore: mockDisableMaintenanceCore,
  enableSchema: { safeParse: (v: unknown) => ({ success: true, data: v }) },
}));

vi.mock("@/lib/ai/github", () => ({
  getRecentCommits: mockGetRecentCommits,
}));

vi.mock("@/lib/deploy/updatePlans", () => ({
  createUpdatePlanViaAdmin: mockCreateUpdatePlanViaAdmin,
}));

vi.mock("@/lib/deploy/vercel", () => ({
  triggerDeployHook: mockTriggerDeployHook,
  getPreviousProductionDeployment: mockGetPreviousProductionDeployment,
  promoteDeployment: mockPromoteDeployment,
}));

import { TOOL_REGISTRY, getTool, isAutoExecuted } from "./toolRegistry";

describe("TOOL_REGISTRY", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gives every tool a unique name", () => {
    const names = TOOL_REGISTRY.map((tool) => tool.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("marks only low risk as auto-executed", () => {
    expect(isAutoExecuted("low")).toBe(true);
    expect(isAutoExecuted("medium")).toBe(false);
    expect(isAutoExecuted("high")).toBe(false);
    expect(isAutoExecuted("critical")).toBe(false);
  });

  it("assigns the risk levels this project's own spec examples call for", () => {
    const riskByName = Object.fromEntries(TOOL_REGISTRY.map((t) => [t.name, t.riskLevel]));
    expect(riskByName.get_system_health).toBe("low");
    expect(riskByName.create_announcement_draft).toBe("low");
    expect(riskByName.enable_maintenance).toBe("medium");
    expect(riskByName.restart_game_server).toBe("medium");
    expect(riskByName.deploy_release).toBe("high");
    expect(riskByName.rollback_release).toBe("critical");
    expect(riskByName.create_update_plan).toBe("medium");
  });

  it("getTool returns undefined for an unregistered name (e.g. a hallucinated tool)", () => {
    expect(getTool("delete_everything")).toBeUndefined();
  });

  it("get_system_health calls the real health check functions", async () => {
    mockCheckDatabaseReachable.mockResolvedValue(true);
    mockGetSystemHealthSnapshot.mockResolvedValue({ web: "healthy" });

    const result = await getTool("get_system_health")!.handler({}, "ai");

    expect(mockGetSystemHealthSnapshot).toHaveBeenCalledWith(true);
    expect(result).toEqual({ ok: true, data: { web: "healthy" } });
  });

  it("get_git_changes reports not available without a token, via the real github module", async () => {
    mockGetRecentCommits.mockResolvedValue({ available: false, reason: "no token" });

    const result = await getTool("get_git_changes")!.handler({}, "ai");

    expect(result).toEqual({ ok: false, message: "no token" });
  });

  it("get_recent_errors is honestly unavailable -- no log aggregation exists", async () => {
    const result = await getTool("get_recent_errors")!.handler({}, "ai");
    expect(result.ok).toBe(false);
  });

  it("create_announcement_draft delegates to the core function with the given actorType", async () => {
    mockCreateAnnouncementDraftCore.mockResolvedValue({ success: true, data: { id: "ann-1" } });

    const result = await getTool("create_announcement_draft")!.handler(
      { title: "t", body: "b" },
      "ai",
    );

    expect(mockCreateAnnouncementDraftCore).toHaveBeenCalledWith({ title: "t", body: "b" }, "ai");
    expect(result).toEqual({ ok: true, data: { id: "ann-1" } });
  });

  it("enable_maintenance delegates to the core function with the given actorType", async () => {
    mockEnableMaintenanceCore.mockResolvedValue({ success: true, data: null });

    const result = await getTool("enable_maintenance")!.handler({ message: "m" }, "admin");

    expect(mockEnableMaintenanceCore).toHaveBeenCalledWith({ message: "m" }, "admin");
    expect(result).toEqual({ ok: true });
  });

  it("disable_maintenance delegates to the core function with the given actorType", async () => {
    mockDisableMaintenanceCore.mockResolvedValue({ success: true, data: null });

    const result = await getTool("disable_maintenance")!.handler({}, "admin");

    expect(mockDisableMaintenanceCore).toHaveBeenCalledWith("admin");
    expect(result).toEqual({ ok: true });
  });

  it("restart_game_server reports not configured -- there is no deployment target to restart, ever", async () => {
    const result = await getTool("restart_game_server")!.handler({}, "admin");
    expect(result.ok).toBe(false);
    expect(result.message).toContain("배포되어 있지 않아");
  });

  it("deploy_release calls the real Vercel deploy hook and reports its outcome honestly", async () => {
    mockTriggerDeployHook.mockResolvedValue({ ok: false, message: "VERCEL_DEPLOY_HOOK_URL이 설정되어 있지 않습니다." });

    const result = await getTool("deploy_release")!.handler({}, "admin");

    expect(mockTriggerDeployHook).toHaveBeenCalledOnce();
    expect(result).toEqual({ ok: false, message: "VERCEL_DEPLOY_HOOK_URL이 설정되어 있지 않습니다." });
  });

  it("deploy_release reports success when the real deploy hook call succeeds", async () => {
    mockTriggerDeployHook.mockResolvedValue({ ok: true });
    const result = await getTool("deploy_release")!.handler({}, "admin");
    expect(result).toEqual({ ok: true });
  });

  it("rollback_release looks up the real previous deployment before ever attempting to promote anything", async () => {
    mockGetPreviousProductionDeployment.mockResolvedValue({
      available: false,
      reason: "VERCEL_TOKEN 또는 VERCEL_PROJECT_ID가 설정되어 있지 않습니다.",
    });

    const result = await getTool("rollback_release")!.handler({}, "admin");

    expect(result).toEqual({
      ok: false,
      message: "VERCEL_TOKEN 또는 VERCEL_PROJECT_ID가 설정되어 있지 않습니다.",
    });
    expect(mockPromoteDeployment).not.toHaveBeenCalled();
  });

  it("rollback_release promotes the real previous deployment when one is found", async () => {
    mockGetPreviousProductionDeployment.mockResolvedValue({
      available: true,
      deployment: { id: "dpl_prev", readyState: "READY", url: "prev.vercel.app" },
    });
    mockPromoteDeployment.mockResolvedValue({ ok: true });

    const result = await getTool("rollback_release")!.handler({}, "admin");

    expect(mockPromoteDeployment).toHaveBeenCalledWith("dpl_prev");
    expect(result.ok).toBe(true);
  });

  it("create_update_plan delegates to the real admin-session writer", async () => {
    mockCreateUpdatePlanViaAdmin.mockResolvedValue({ id: "plan-1" });

    const result = await getTool("create_update_plan")!.handler({}, "admin");

    expect(mockCreateUpdatePlanViaAdmin).toHaveBeenCalledOnce();
    expect(result).toEqual({ ok: true, data: { id: "plan-1" } });
  });

  it("create_update_plan reports failure without throwing when plan creation fails", async () => {
    mockCreateUpdatePlanViaAdmin.mockResolvedValue(null);
    const result = await getTool("create_update_plan")!.handler({}, "admin");
    expect(result.ok).toBe(false);
  });
});
