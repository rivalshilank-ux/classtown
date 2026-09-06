"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Badge, Button } from "@classtown/ui";
import { approveApproval, rejectApproval } from "@/lib/ai/approvalActions";
import type { PendingApproval } from "@/lib/ai/approvals";

const RISK_TONE: Record<string, "good" | "accent" | "bad" | "wood"> = {
  low: "good",
  medium: "accent",
  high: "bad",
  critical: "bad",
};

export function ApprovalRow({ approval }: { approval: PendingApproval }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleApprove() {
    if (isPending) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await approveApproval(approval.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleReject() {
    if (isPending) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await rejectApproval(approval.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <tr className="border-b-2 border-wood-600/20 last:border-b-0">
      <td className="px-4 py-3">
        <Badge tone={RISK_TONE[approval.riskLevel] ?? "wood"}>{approval.riskLevel}</Badge>
      </td>
      <td className="px-4 py-3 text-ink-900">{approval.toolName}</td>
      <td className="px-4 py-3 font-mono text-xs text-ink-600">
        {JSON.stringify(approval.input)}
      </td>
      <td className="px-4 py-3 text-ink-600">
        {new Date(approval.createdAt).toLocaleString("ko-KR")}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col items-end gap-1">
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleApprove} isLoading={isPending}>
              승인
            </Button>
            <Button variant="ghost" onClick={handleReject} isLoading={isPending}>
              거부
            </Button>
          </div>
          {error && <Alert variant="error">{error}</Alert>}
        </div>
      </td>
    </tr>
  );
}
