"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Panel, TextField } from "@classtown/ui";
import { classNameSchema, formatEntryCode } from "@classtown/shared-schema";
import type { ClassRecord } from "@classtown/shared-types";
import { archiveClass, regenerateClassCode, renameClass } from "@/lib/class/teacherActions";

interface ClassManagementProps {
  classRecord: ClassRecord;
}

export function ClassManagement({ classRecord }: ClassManagementProps) {
  const router = useRouter();
  const [name, setName] = useState(classRecord.name);
  const [isRenaming, startRename] = useTransition();
  const [isRegenerating, startRegenerate] = useTransition();
  const [isArchiving, startArchive] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isPending = isRenaming || isRegenerating || isArchiving;

  function handleRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) {
      return;
    }
    setError(null);

    const parsed = classNameSchema.safeParse(name);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "학급 이름을 확인해 주세요.");
      return;
    }

    startRename(async () => {
      const result = await renameClass(classRecord.id, parsed.data);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleRegenerate() {
    if (isPending) {
      return;
    }
    if (!window.confirm("참가 코드를 새로 만들까요? 기존 코드로는 더 이상 입장할 수 없어요.")) {
      return;
    }
    setError(null);

    startRegenerate(async () => {
      const result = await regenerateClassCode(classRecord.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleArchive() {
    if (isPending) {
      return;
    }
    if (
      !window.confirm(
        "학급을 보관할까요? 보관된 학급에는 학생이 새로 입장할 수 없어요. 학생 기록은 남아요.",
      )
    ) {
      return;
    }
    setError(null);

    startArchive(async () => {
      const result = await archiveClass(classRecord.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Panel variant="paper" className="flex flex-col gap-4">
      <span className="font-[family-name:var(--font-display)] text-xs tracking-wide text-ink-600">
        학급 관리
      </span>

      {error && <Alert variant="error">{error}</Alert>}

      <form onSubmit={handleRename} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <TextField
            label="학급 이름"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={60}
            disabled={isPending}
            required
          />
        </div>
        <Button
          type="submit"
          variant="secondary"
          isLoading={isRenaming}
          disabled={name === classRecord.name || isPending}
        >
          이름 저장
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={handleRegenerate} isLoading={isRegenerating} disabled={isPending}>
          참가 코드 재발급
        </Button>
        <Button variant="ghost" onClick={handleArchive} isLoading={isArchiving} disabled={isPending}>
          학급 보관
        </Button>
      </div>
      <p className="text-xs text-ink-600">
        현재 참가 코드: {formatEntryCode(classRecord.classCode)}
      </p>
    </Panel>
  );
}
