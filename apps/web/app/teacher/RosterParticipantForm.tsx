"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, TextField } from "@classtown/ui";
import { formatEntryCode, nicknameSchema } from "@classtown/shared-schema";
import type { RosterParticipant } from "@classtown/shared-types";
import { createRosterParticipant } from "@/lib/class/teacherActions";

interface RosterParticipantFormProps {
  classId: string;
}

/**
 * Roster mode has no self-registration fallback (see `join_class` in
 * 20260905070000_class_rpcs.sql), so this is the only way a student ever
 * gets into a roster class: the teacher mints a code here and hands it out.
 */
export function RosterParticipantForm({ classId }: RosterParticipantFormProps) {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<RosterParticipant | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) {
      return;
    }
    setError(null);

    const parsed = nicknameSchema.safeParse(nickname);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "닉네임을 확인해 주세요.");
      return;
    }

    startTransition(async () => {
      const result = await createRosterParticipant(classId, parsed.data);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setCreated(result.data);
      setNickname("");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2 border-b-2 border-wood-600/25 pb-3">
      {error && <Alert variant="error">{error}</Alert>}
      {created && (
        <Alert variant="success">
          {created.nickname} 학생 코드: {formatEntryCode(created.participantCode)}
        </Alert>
      )}
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <TextField
            label="학생 이름/닉네임 추가"
            name="nickname"
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            placeholder="예: 김민준"
            maxLength={20}
            disabled={isPending}
            required
          />
        </div>
        <Button type="submit" variant="secondary" isLoading={isPending}>
          학생 코드 만들기
        </Button>
      </form>
    </div>
  );
}
