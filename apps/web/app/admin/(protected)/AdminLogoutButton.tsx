"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button } from "@classtown/ui";
import { signOutAdmin } from "@/lib/auth/adminActions";

export function AdminLogoutButton({ adminName }: { adminName: string }) {
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
        const result = await signOutAdmin();
        if (!result.success) {
          setError(result.error);
          return;
        }
        router.push("/admin/login");
        router.refresh();
      } catch {
        setError("로그아웃에 실패했습니다. 다시 시도해 주세요.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-cream-400/80 sm:inline">{adminName}</span>
        <Button variant="ghost" onClick={handleClick} isLoading={isPending}>
          {isPending ? "로그아웃 중..." : "로그아웃"}
        </Button>
      </div>
      {error && <Alert variant="error">{error}</Alert>}
    </div>
  );
}
