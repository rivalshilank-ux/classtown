import Link from "next/link";
import { Alert, Badge, Panel, StatTile, StatusDot } from "@classtown/ui";
import { getOverviewStats } from "@/lib/admin/queries";
import { getSystemHealthSnapshot, type ServiceStatus } from "@/lib/admin/health";
import { getCurrentMaintenanceWindow } from "@/lib/admin/maintenance";

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

const STATUS_DOT_TONE: Record<ServiceStatus, "good" | "warn" | "bad" | "stone"> = {
  healthy: "good",
  degraded: "warn",
  down: "bad",
  unknown: "stone",
};

function HealthRow({ label, status }: { label: string; status: ServiceStatus }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b-2 border-wood-600/40 py-2 last:border-b-0">
      <span className="flex items-center gap-2 text-sm text-ink-900">
        <StatusDot tone={STATUS_DOT_TONE[status]} />
        {label}
      </span>
      <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
    </div>
  );
}

export default async function AdminOverviewPage() {
  const statsResult = await getOverviewStats().catch(() => null);
  const health = await getSystemHealthSnapshot(statsResult !== null);
  const maintenance = await getCurrentMaintenanceWindow();

  const stats = statsResult ?? {
    totalTeachers: 0,
    totalClasses: 0,
    activeClasses: 0,
    totalStudents: 0,
    onlineStudents: 0,
  };

  return (
    <>
      <div className="flex flex-col gap-1">
        <span className="font-[family-name:var(--font-display)] text-xs tracking-wide text-ink-600">
          ADMIN OVERVIEW
        </span>
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-ink-900 sm:text-3xl">
          지금 서비스가 정상인가요?
        </h1>
      </div>

      {!statsResult && (
        <Alert variant="error">
          운영 데이터를 불러오지 못했습니다. 데이터베이스 연결을 확인해 주세요.
        </Alert>
      )}

      {maintenance && (
        <Alert variant="warning">
          <span className="font-[family-name:var(--font-display)] text-base">점검 중</span>
          <br />
          {maintenance.message} — <Link href="/admin/system" className="underline">System Health에서 관리</Link>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile icon="friend" value={stats.totalTeachers.toLocaleString("ko-KR")} label="전체 교사" />
        <StatTile icon="house" value={stats.totalClasses.toLocaleString("ko-KR")} label="전체 학급" />
        <StatTile icon="map" value={stats.activeClasses.toLocaleString("ko-KR")} label="활성 학급" />
        <StatTile icon="backpack" value={stats.totalStudents.toLocaleString("ko-KR")} label="전체 학생" />
        <StatTile
          indicator={<StatusDot tone={stats.onlineStudents > 0 ? "good" : "stone"} />}
          value={stats.onlineStudents.toLocaleString("ko-KR")}
          label="접속 중인 학생"
        />
      </div>

      <Panel variant="paper" className="flex flex-col gap-1">
        <span className="font-[family-name:var(--font-display)] text-sm text-ink-900">
          System Health
        </span>
        <HealthRow label="Web" status={health.web} />
        <HealthRow label="Auth" status={health.auth} />
        <HealthRow label="Database" status={health.database} />
        <HealthRow label="Game Server" status={health.gameServer} />
      </Panel>

      <Alert variant="info">
        <span className="font-[family-name:var(--font-display)] text-base">준비 중인 기능</span>
        <br />
        감사 로그는 <code>/admin/audit</code>, 공지 관리는 <code>/admin/announcements</code>,
        점검 모드는 <code>/admin/system</code>, 업데이트 계획과 자동 배포 파이프라인은{" "}
        <code>/admin/updates</code>에서 확인할 수 있습니다. 시스템 오류 집계는 로그 수집 체계가
        없어 아직 표시되지 않습니다 — 현재는 실제 데이터가 없는 상태로 값을 꾸며내지 않습니다.
      </Alert>
    </>
  );
}
