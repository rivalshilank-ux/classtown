import { Card } from "@classtown/ui";
import { getOpsConfig } from "@/lib/deploy/opsConfig";
import { listUpdateExecutions, listUpdatePlans } from "@/lib/deploy/updatePlans";
import { UpdatePlanRow } from "./UpdatePlanRow";
import { OpsConfigForm } from "./OpsConfigForm";

export const dynamic = "force-dynamic";

export default async function AdminUpdatesPage() {
  const [plans, opsConfig] = await Promise.all([listUpdatePlans(), getOpsConfig()]);
  const executionsByPlan = await Promise.all(plans.map((plan) => listUpdateExecutions(plan.id)));

  return (
    <>
      <div className="flex flex-col gap-1">
        <span className="font-[family-name:var(--font-display)] text-xs tracking-wide text-ink-600">
          ADMIN
        </span>
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-ink-900 sm:text-3xl">
          Updates
        </h1>
        <p className="text-sm text-ink-600">
          매주 일요일 자동으로 생성되는 업데이트 계획을 검토하고 승인합니다. 토요일 파이프라인은
          아래 자동화 설정이 켜져 있고 승인된 계획이 있을 때만 실제로 배포를 진행합니다.
        </p>
      </div>

      <OpsConfigForm current={opsConfig} />

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b-2 border-wood-600/40 text-xs text-ink-600">
              <th className="px-4 py-3 font-normal">상태</th>
              <th className="px-4 py-3 font-normal">위험도</th>
              <th className="px-4 py-3 font-normal">생성 주체</th>
              <th className="px-4 py-3 font-normal">요약 / 실행 이력</th>
              <th className="px-4 py-3 font-normal">생성 시각</th>
              <th className="px-4 py-3 font-normal">결정</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan, index) => (
              <UpdatePlanRow key={plan.id} plan={plan} executions={executionsByPlan[index] ?? []} />
            ))}
            {plans.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-ink-600">
                  아직 생성된 업데이트 계획이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </>
  );
}
