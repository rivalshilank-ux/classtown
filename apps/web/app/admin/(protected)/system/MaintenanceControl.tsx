"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert, Badge, Button, Card, TextField } from "@classtown/ui";
import { disableMaintenance, enableMaintenance } from "@/lib/admin/maintenanceActions";
import type { MaintenanceWindow } from "@/lib/admin/maintenance";

export function MaintenanceControl({ current }: { current: MaintenanceWindow | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleEnable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) {
      return;
    }
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const input = {
      message: formData.get("message"),
      reason: formData.get("reason") || undefined,
    };

    startTransition(async () => {
      const result = await enableMaintenance(input);
      if (!result.success) {
        setError(result.error);
        return;
      }
      form.reset();
      router.refresh();
    });
  }

  function handleDisable() {
    if (isPending) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await disableMaintenance();
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="font-[family-name:var(--font-display)] text-sm text-ink-900">
          Maintenance Mode
        </span>
        <Badge tone={current ? "bad" : "good"}>{current ? "점검 중" : "정상 운영"}</Badge>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {current ? (
        <>
          <p className="text-sm text-ink-900">{current.message}</p>
          <p className="text-xs text-ink-600">
            시작: {new Date(current.startsAt).toLocaleString("ko-KR")}
          </p>
          <Button
            variant="secondary"
            onClick={handleDisable}
            isLoading={isPending}
            className="self-start"
          >
            점검 종료
          </Button>
        </>
      ) : (
        <form onSubmit={handleEnable} className="flex flex-col gap-3">
          <TextField label="안내 메시지" name="message" required disabled={isPending} />
          <TextField label="사유 (선택)" name="reason" disabled={isPending} />
          <Button type="submit" variant="secondary" isLoading={isPending} className="self-start">
            점검 시작
          </Button>
        </form>
      )}
    </Card>
  );
}
