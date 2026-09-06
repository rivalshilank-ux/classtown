"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button } from "@classtown/ui";
import { expireAnnouncement, publishAnnouncement } from "@/lib/admin/announcementActions";
import type { AnnouncementStatus } from "@/lib/admin/announcements";

export function AnnouncementRowActions({
  id,
  status,
}: {
  id: string;
  status: AnnouncementStatus;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handlePublish() {
    if (isPending) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await publishAnnouncement(id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleExpire() {
    if (isPending) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await expireAnnouncement(id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        {status !== "published" && (
          <Button variant="secondary" onClick={handlePublish} isLoading={isPending}>
            게시
          </Button>
        )}
        {status !== "expired" && (
          <Button variant="ghost" onClick={handleExpire} isLoading={isPending}>
            종료
          </Button>
        )}
      </div>
      {error && <Alert variant="error">{error}</Alert>}
    </div>
  );
}
