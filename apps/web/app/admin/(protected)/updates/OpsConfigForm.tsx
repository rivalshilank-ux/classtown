"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card } from "@classtown/ui";
import { updateOpsConfig } from "@/lib/deploy/opsConfigActions";
import type { OpsConfig } from "@/lib/deploy/opsConfig";

const FIELDS: { key: keyof OpsConfig; label: string; help: string }[] = [
  {
    key: "autoUpdateEnabled",
    label: "자동 업데이트 실행",
    help: "끄면 토요일 파이프라인은 승인된 계획이 있어도 아무 것도 하지 않고 종료됩니다.",
  },
  {
    key: "autoAnnouncementEnabled",
    label: "완료 공지 자동 게시",
    help: "업데이트가 성공적으로 끝나면 공지사항을 자동으로 게시합니다.",
  },
  {
    key: "autoRollbackEnabled",
    label: "실패 시 자동 롤백",
    help: "헬스 체크가 실패하면 직전 배포로 자동 승격을 시도합니다. 꺼져 있으면 실패 상태로 멈추고 관리자를 기다립니다.",
  },
  {
    key: "autoHealthReportEnabled",
    label: "일일 헬스 체크 리포트",
    help: "매일 게임 서버 상태를 확인해 이상이 있으면 Discord(설정된 경우)로 알리고 감사 로그에 남깁니다.",
  },
];

export function OpsConfigForm({ current }: { current: OpsConfig }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;
    setError(null);

    const formData = new FormData(event.currentTarget);
    const input = {
      autoUpdateEnabled: formData.get("autoUpdateEnabled") === "on",
      autoAnnouncementEnabled: formData.get("autoAnnouncementEnabled") === "on",
      autoRollbackEnabled: formData.get("autoRollbackEnabled") === "on",
      autoHealthReportEnabled: formData.get("autoHealthReportEnabled") === "on",
    };

    startTransition(async () => {
      const result = await updateOpsConfig(input);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Card className="flex flex-col gap-3">
      <span className="font-[family-name:var(--font-display)] text-sm text-ink-900">자동화 설정</span>
      {error && <Alert variant="error">{error}</Alert>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {FIELDS.map((field) => (
          <label key={field.key} className="flex items-start gap-3 text-sm text-ink-900">
            <input
              type="checkbox"
              name={field.key}
              defaultChecked={current[field.key]}
              disabled={isPending}
              className="mt-1 h-4 w-4 accent-accent-600"
            />
            <span className="flex flex-col gap-0.5">
              <span>{field.label}</span>
              <span className="text-xs text-ink-600">{field.help}</span>
            </span>
          </label>
        ))}
        <Button type="submit" variant="secondary" isLoading={isPending} className="self-start">
          저장
        </Button>
      </form>
    </Card>
  );
}
