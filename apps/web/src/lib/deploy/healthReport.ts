import "server-only";
import { checkGameServer, type ServiceStatus } from "@/lib/admin/health";
import { getOpsConfigForScheduler } from "./opsConfig";
import { postDiscordReport } from "./discord";
import { recordSystemAuditLog } from "./systemMaintenance";

export type HealthReportOutcome = "skipped" | "healthy" | "unhealthy";

export interface HealthReportResult {
  outcome: HealthReportOutcome;
  gameServer?: ServiceStatus;
}

/**
 * The scheduled counterpart to /admin/system's on-demand check -- see
 * docs/operations/operations.md. Database reachability needs no separate
 * probe here: getOpsConfigForScheduler() itself is a real query, so
 * reaching the branch below already proves the database answered.
 *
 * Game server reachability reuses the exact pure-fetch check /admin/system
 * uses (no Supabase session involved either way). "unknown"
 * (NEXT_PUBLIC_GAME_SERVER_URL unset -- apps/game-server is not deployed
 * anywhere in this project today, per docs/operations/operations.md) is
 * not treated as unhealthy: there is nothing configured to alert on.
 */
export async function runScheduledHealthReport(): Promise<HealthReportResult> {
  const config = await getOpsConfigForScheduler();
  if (!config || !config.autoHealthReportEnabled) {
    return { outcome: "skipped" };
  }

  const gameServer = await checkGameServer();
  if (gameServer !== "down" && gameServer !== "degraded") {
    return { outcome: "healthy", gameServer };
  }

  await postDiscordReport(
    `⚠️ ClassTown 헬스 체크: 게임 서버 상태가 '${gameServer}' 입니다.`,
  );
  await recordSystemAuditLog({
    action: "health_report.unhealthy",
    targetType: "game_server",
    riskLevel: "medium",
    metadata: { gameServer },
  });

  return { outcome: "unhealthy", gameServer };
}
