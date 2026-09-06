import { Badge, Card } from "@classtown/ui";
import { listAuditLogs, AUDIT_PAGE_SIZE, type AuditRiskLevel, type AuditStatus } from "@/lib/admin/audit";
import { PaginationControls } from "../PaginationControls";

export const dynamic = "force-dynamic";

const RISK_TONE: Record<AuditRiskLevel, "good" | "accent" | "bad" | "wood"> = {
  low: "good",
  medium: "accent",
  high: "bad",
  critical: "bad",
};

const STATUS_TONE: Record<AuditStatus, "good" | "accent" | "bad" | "wood"> = {
  success: "good",
  pending: "accent",
  failed: "bad",
};

interface AuditPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function AdminAuditPage({ searchParams }: AuditPageProps) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
  const { items, total } = await listAuditLogs(page);
  const totalPages = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE));

  return (
    <>
      <div className="flex flex-col gap-1">
        <span className="font-[family-name:var(--font-display)] text-xs tracking-wide text-ink-600">
          ADMIN
        </span>
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-ink-900 sm:text-3xl">
          Audit Logs
        </h1>
        <p className="text-sm text-ink-600">
          관리자 로그인/로그아웃과 상태를 변경하는 관리 작업만 기록됩니다. 단순 조회는 기록되지
          않습니다. 전체 {total.toLocaleString("ko-KR")}건
        </p>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b-2 border-wood-600/40 text-xs text-ink-600">
              <th className="px-4 py-3 font-normal">시각</th>
              <th className="px-4 py-3 font-normal">행위자</th>
              <th className="px-4 py-3 font-normal">액션</th>
              <th className="px-4 py-3 font-normal">대상</th>
              <th className="px-4 py-3 font-normal">위험도</th>
              <th className="px-4 py-3 font-normal">결과</th>
            </tr>
          </thead>
          <tbody>
            {items.map((entry) => (
              <tr key={entry.id} className="border-b-2 border-wood-600/20 last:border-b-0">
                <td className="px-4 py-3 whitespace-nowrap text-ink-600">
                  {new Date(entry.createdAt).toLocaleString("ko-KR")}
                </td>
                <td className="px-4 py-3 text-ink-900">
                  {entry.actorType}
                  {entry.actorId && (
                    <span className="block text-xs text-ink-600/60">{entry.actorId}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-ink-900">{entry.action}</td>
                <td className="px-4 py-3 text-ink-600">
                  {entry.targetType ? (
                    <>
                      {entry.targetType}
                      {entry.targetId && (
                        <span className="block text-xs text-ink-600/60">{entry.targetId}</span>
                      )}
                    </>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={RISK_TONE[entry.riskLevel]}>{entry.riskLevel}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={STATUS_TONE[entry.status]}>{entry.status}</Badge>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-ink-600">
                  기록된 감사 로그가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <PaginationControls page={page} totalPages={totalPages} basePath="/admin/audit" />
    </>
  );
}
