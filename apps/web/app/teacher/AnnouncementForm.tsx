"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Alert, Button, Panel, TextField } from "@classtown/ui";
import { classAnnouncementSchema } from "@classtown/shared-schema";
import { sendAnnouncement } from "@/lib/class/teacherActions";

interface AnnouncementFormProps {
  classId: string;
}

/**
 * Delivered live to whichever of this class's students are connected to
 * TownRoom right now (see apps/game-server/src/rooms/TownRoom.ts's
 * deliverAnnouncements) -- there is no delivery receipt, so this only ever
 * confirms the message was queued, never that anyone actually saw it.
 */
export function AnnouncementForm({ classId }: AnnouncementFormProps) {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) {
      return;
    }
    setError(null);
    setSent(false);

    const parsed = classAnnouncementSchema.safeParse(message);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "공지 내용을 확인해 주세요.");
      return;
    }

    startTransition(async () => {
      const result = await sendAnnouncement(classId, parsed.data);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setMessage("");
      setSent(true);
    });
  }

  return (
    <Panel variant="paper" className="flex flex-col gap-3">
      <span className="font-[family-name:var(--font-display)] text-xs tracking-wide text-ink-600">
        학급 공지
      </span>

      {error && <Alert variant="error">{error}</Alert>}
      {sent && <Alert variant="success">지금 접속 중인 학생에게 공지를 보냈어요.</Alert>}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <TextField
            label="공지 내용"
            name="message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="예: 5분 뒤 정리해 주세요"
            maxLength={280}
            disabled={isPending}
            required
          />
        </div>
        <Button type="submit" variant="secondary" isLoading={isPending}>
          보내기
        </Button>
      </form>
      <p className="text-xs text-ink-600">
        지금 접속 중인 학생에게만 전달돼요. 접속 기록으로 남지 않아요.
      </p>
    </Panel>
  );
}
