"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, TextField } from "@classtown/ui";
import { adminLoginSchema } from "@classtown/shared-schema";
import { signInAdmin } from "@/lib/auth/adminActions";
import { toFieldErrors } from "@/lib/auth/formErrors";

export function AdminLoginForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) {
      return;
    }
    setFormError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const input = {
      adminCode: formData.get("adminCode"),
      email: formData.get("email"),
      password: formData.get("password"),
    };

    const clientCheck = adminLoginSchema.safeParse(input);
    if (!clientCheck.success) {
      setFieldErrors(toFieldErrors(clientCheck.error));
      return;
    }

    startTransition(async () => {
      try {
        const result = await signInAdmin(input);
        if (!result.success) {
          setFormError(result.error);
          setFieldErrors(result.fieldErrors ?? {});
          return;
        }
        router.push("/admin");
        router.refresh();
      } catch {
        setFormError("로그인 중 오류가 발생했습니다. 다시 시도해 주세요.");
      }
    });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-chalk-900 p-4">
      <div className="flex flex-col items-center gap-1 text-center">
        <span className="font-[family-name:var(--font-display)] text-xs tracking-widest text-cream-400/70">
          CLASSTOWN
        </span>
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-cream-400">
          Operations Center
        </h1>
      </div>

      <Card className="max-w-sm">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {formError && <Alert variant="error">{formError}</Alert>}

          <TextField
            label="관리자 코드"
            name="adminCode"
            type="password"
            autoComplete="off"
            required
            disabled={isPending}
            error={fieldErrors.adminCode}
          />
          <TextField
            label="이메일"
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={isPending}
            error={fieldErrors.email}
          />
          <TextField
            label="비밀번호"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            disabled={isPending}
            error={fieldErrors.password}
          />

          <Button type="submit" variant="secondary" isLoading={isPending} className="w-full">
            {isPending ? "로그인 중..." : "로그인"}
          </Button>
        </form>
      </Card>

      <p className="text-xs text-cream-400/50">관리자 전용. 계정은 운영팀이 발급합니다.</p>
    </div>
  );
}
