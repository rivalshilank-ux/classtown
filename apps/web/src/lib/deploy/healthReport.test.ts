import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { mockGetOpsConfigForScheduler, mockCheckGameServer, mockPostDiscordReport, mockRecordSystemAuditLog } =
  vi.hoisted(() => ({
    mockGetOpsConfigForScheduler: vi.fn(),
    mockCheckGameServer: vi.fn(),
    mockPostDiscordReport: vi.fn(),
    mockRecordSystemAuditLog: vi.fn(),
  }));

vi.mock("./opsConfig", () => ({
  getOpsConfigForScheduler: mockGetOpsConfigForScheduler,
}));

vi.mock("@/lib/admin/health", () => ({
  checkGameServer: mockCheckGameServer,
}));

vi.mock("./discord", () => ({
  postDiscordReport: mockPostDiscordReport,
}));

vi.mock("./systemMaintenance", () => ({
  recordSystemAuditLog: mockRecordSystemAuditLog,
}));

import { runScheduledHealthReport } from "./healthReport";

const ENABLED_CONFIG = {
  autoUpdateEnabled: false,
  autoAnnouncementEnabled: false,
  autoRollbackEnabled: false,
  autoHealthReportEnabled: true,
};

describe("runScheduledHealthReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips without checking anything when ops_config can't be read (database down, or a query error)", async () => {
    mockGetOpsConfigForScheduler.mockResolvedValue(null);

    const result = await runScheduledHealthReport();

    expect(result).toEqual({ outcome: "skipped" });
    expect(mockCheckGameServer).not.toHaveBeenCalled();
  });

  it("skips without checking anything when auto_health_report_enabled is off (the default)", async () => {
    mockGetOpsConfigForScheduler.mockResolvedValue({ ...ENABLED_CONFIG, autoHealthReportEnabled: false });

    const result = await runScheduledHealthReport();

    expect(result).toEqual({ outcome: "skipped" });
    expect(mockCheckGameServer).not.toHaveBeenCalled();
  });

  it("reports healthy and sends no alert when the game server is reachable", async () => {
    mockGetOpsConfigForScheduler.mockResolvedValue(ENABLED_CONFIG);
    mockCheckGameServer.mockResolvedValue("healthy");

    const result = await runScheduledHealthReport();

    expect(result).toEqual({ outcome: "healthy", gameServer: "healthy" });
    expect(mockPostDiscordReport).not.toHaveBeenCalled();
    expect(mockRecordSystemAuditLog).not.toHaveBeenCalled();
  });

  it("treats 'unknown' (game server URL not configured) as healthy, not an alert", async () => {
    mockGetOpsConfigForScheduler.mockResolvedValue(ENABLED_CONFIG);
    mockCheckGameServer.mockResolvedValue("unknown");

    const result = await runScheduledHealthReport();

    expect(result).toEqual({ outcome: "healthy", gameServer: "unknown" });
    expect(mockPostDiscordReport).not.toHaveBeenCalled();
  });

  it("alerts and logs a system audit entry when the game server is down", async () => {
    mockGetOpsConfigForScheduler.mockResolvedValue(ENABLED_CONFIG);
    mockCheckGameServer.mockResolvedValue("down");

    const result = await runScheduledHealthReport();

    expect(result).toEqual({ outcome: "unhealthy", gameServer: "down" });
    expect(mockPostDiscordReport).toHaveBeenCalledWith(expect.stringContaining("down"));
    expect(mockRecordSystemAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "health_report.unhealthy", riskLevel: "medium" }),
    );
  });

  it("alerts on 'degraded' the same way as 'down'", async () => {
    mockGetOpsConfigForScheduler.mockResolvedValue(ENABLED_CONFIG);
    mockCheckGameServer.mockResolvedValue("degraded");

    const result = await runScheduledHealthReport();

    expect(result.outcome).toBe("unhealthy");
    expect(mockPostDiscordReport).toHaveBeenCalled();
  });
});
