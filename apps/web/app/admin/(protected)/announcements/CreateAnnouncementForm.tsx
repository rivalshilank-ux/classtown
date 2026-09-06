"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, TextField } from "@classtown/ui";
import { createAnnouncementDraft } from "@/lib/admin/announcementActions";

export function CreateAnnouncementForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) {
      return;
    }
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const input = { title: formData.get("title"), body: formData.get("body") };

    startTransition(async () => {
      const result = await createAnnouncementDraft(input);
      if (!result.success) {
        setError(result.error);
        return;
      }
      form.reset();
      router.refresh();
    });
  }

  return (
    <Card className="flex flex-col gap-3">
      <span className="font-[family-name:var(--font-display)] text-sm text-ink-900">
        새 공지 작성 (초안)
      </span>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {error && <Alert variant="error">{error}</Alert>}
        <TextField label="제목" name="title" required disabled={isPending} />
        <div className="flex flex-col gap-1">
          <label htmlFor="announcement-body" className="text-sm text-ink-600">
            내용
          </label>
          <textarea
            id="announcement-body"
            name="body"
            rows={4}
            required
            disabled={isPending}
            className="pixel-corners-sm border-2 border-wood-600 bg-cream-400 px-3 py-2 text-sm text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
          />
        </div>
        <Button type="submit" variant="secondary" isLoading={isPending} className="self-start">
          초안 저장
        </Button>
      </form>
    </Card>
  );
}
