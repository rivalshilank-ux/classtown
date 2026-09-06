import { Badge, Panel } from "@classtown/ui";
import { checkDatabaseReachable, getSystemHealthSnapshot, type ServiceStatus } from "@/lib/admin/health";
import { getCurrentMaintenanceWindow } from "@/lib/admin/maintenance";
import { MaintenanceControl } from "./MaintenanceControl";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<ServiceStatus, string> = {
  healthy: "정상",
  degraded: "저하됨",
  down: "중단",
  unknown: "알 수 없음",
};

const STATUS_TONE: Record<ServiceStatus, "good" | "bad" | "accent" | "wood"> = {
  healthy: "good",
  degraded: "accent",
  down: "bad",
  unknown: "wood",
};

function HealthRow({ label, status }: { label: string; status: ServiceStatus }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b-2 border-wood-600/40 py-2 last:border-b-0">
      <span className="text-sm text-ink-900">{label}</span>
      <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
    </div>
  );
}

export default async function AdminSystemPage() {
  const databaseOk = await checkDatabaseReachable();
  const [health, maintenance] = await Promise.all([
    getSystemHealthSnapshot(databaseOk),
    getCurrentMaintenanceWindow(),
  ]);

  return (
    <>
      <div className="flex flex-col gap-1">
        <span className="font-[family-name:var(--font-display)] text-xs tracking-wide text-ink-600">
          ADMIN
        </span>
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-ink-900 sm:text-3xl">
          System Health
        </h1>
      </div>

      <Panel variant="paper" className="flex flex-col gap-1">
        <HealthRow label="Web" status={health.web} />
        <HealthRow label="Auth" status={health.auth} />
        <HealthRow label="Database" status={health.database} />
        <HealthRow label="Game Server" status={health.gameServer} />
      </Panel>

      <MaintenanceControl current={maintenance} />
    </>
  );
}
