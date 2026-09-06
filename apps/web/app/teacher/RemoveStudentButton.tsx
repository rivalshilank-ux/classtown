"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button } from "@classtown/ui";
import { removeParticipant } from "@/lib/class/teacherActions";

interface RemoveStudentButtonProps {
  participantId: string;
  nickname: string;
}

export function RemoveStudentButton({ participantId, nickname }: RemoveStudentButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (isPending) {
      return;
    }
    if (!window.confirm(`${nickname} 학생을 학급에서 제거할까요? 기록은 남지만 더 이상 입장할 수 없어요.`)) {
      return;
    }
    setError(null);

    startTransition(async () => {
      const result = await removeParticipant(participantId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="ghost" onClick={handleClick} isLoading={isPending}>
        제거
      </Button>
      {error && <Alert variant="error">{error}</Alert>}
    </div>
  );
}
