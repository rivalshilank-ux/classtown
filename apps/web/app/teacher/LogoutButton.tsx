"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button } from "@classtown/ui";
import { DEFAULT_LOCALE, translate } from "@classtown/i18n";
import { signOutTeacher } from "@/lib/auth/teacherActions";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (isPending) {
      return;
    }
    setError(null);

    startTransition(async () => {
      try {
        const result = await signOutTeacher();
        if (!result.success) {
          setError(result.error);
          return;
        }
        router.push("/login");
        router.refresh();
      } catch {
        setError("로그아웃에 실패했습니다. 다시 시도해 주세요.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button variant="ghost" onClick={handleClick} isLoading={isPending}>
        {isPending
          ? translate(DEFAULT_LOCALE, "auth.teacher.loggingOut")
          : translate(DEFAULT_LOCALE, "auth.teacher.logout")}
      </Button>
      {error && <Alert variant="error">{error}</Alert>}
    </div>
  );
}
