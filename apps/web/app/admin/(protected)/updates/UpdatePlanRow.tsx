"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Badge, Button } from "@classtown/ui";
import { approveUpdatePlan, cancelUpdatePlan } from "@/lib/deploy/updatePlanActions";
import type { UpdateExecutionSummary, UpdatePlanSummary } from "@/lib/deploy/updatePlans";

const RISK_TONE: Record<string, "good" | "accent" | "bad" | "wood"> = {
  low: "good",
  medium: "accent",
  high: "bad",
  critical: "bad",
};

const STATUS_TONE: Record<string, "good" | "accent" | "bad" | "wood"> = {
  planned: "wood",
  approved: "accent",
  completed: "good",
  rolled_back: "accent",
  cancelled: "wood",
  failed: "bad",
};

const CREATOR_LABEL: Record<string, string> = {
  admin: "관리자",
  ai: "AI Ops",
  system: "자동 스케줄러",
};

export function UpdatePlanRow({
  plan,
  executions,
}: {
  plan: UpdatePlanSummary;
  executions: UpdateExecutionSummary[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleApprove() {
    if (isPending) return;
    setError(null);
    startTransition(async () => {
      const result = await approveUpdatePlan(plan.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleCancel() {
    if (isPending) return;
    setError(null);
    startTransition(async () => {
      const result = await cancelUpdatePlan(plan.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  const canDecide = plan.status === "planned" || plan.status === "approved";

  return (
    <tr className="border-b-2 border-wood-600/20 last:border-b-0 align-top">
      <td className="px-4 py-3">
        <Badge tone={STATUS_TONE[plan.status] ?? "wood"}>{plan.status}</Badge>
      </td>
      <td className="px-4 py-3">
        <Badge tone={RISK_TONE[plan.riskLevel] ?? "wood"}>{plan.riskLevel}</Badge>
      </td>
      <td className="px-4 py-3 text-ink-600">{CREATOR_LABEL[plan.createdByType] ?? plan.createdByType}</td>
      <td className="max-w-xl px-4 py-3 text-xs text-ink-900">
        <p className="whitespace-pre-wrap">{plan.summary}</p>
        {executions.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1 border-t border-wood-600/20 pt-2">
            {executions.map((execution) => (
              <li key={execution.id} className="flex items-center gap-2 text-ink-600">
                <Badge tone={STATUS_TONE[execution.state] ?? "wood"}>{execution.state}</Badge>
                <span>{new Date(execution.startedAt).toLocaleString("ko-KR")}</span>
              </li>
            ))}
          </ul>
        )}
      </td>
      <td className="px-4 py-3 text-ink-600">{new Date(plan.createdAt).toLocaleString("ko-KR")}</td>
      <td className="px-4 py-3">
        {canDecide ? (
          <div className="flex flex-col items-end gap-1">
            <div className="flex gap-2">
              {plan.status === "planned" && (
                <Button variant="secondary" onClick={handleApprove} isLoading={isPending}>
                  승인
                </Button>
              )}
              <Button variant="ghost" onClick={handleCancel} isLoading={isPending}>
                취소
              </Button>
            </div>
            {error && <Alert variant="error">{error}</Alert>}
          </div>
        ) : (
          <span className="text-xs text-ink-600">
            {plan.approvedBy ? `승인자: ${plan.approvedBy}` : "-"}
          </span>
        )}
      </td>
    </tr>
  );
}
