"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Alert, Button, Card, Header, TextField } from "@classtown/ui";
import { DEFAULT_LOCALE, translate, type TranslationKey } from "@classtown/i18n";
import { teacherLoginSchema } from "@classtown/shared-schema";
import { signInTeacher } from "@/lib/auth/teacherActions";
import { toFieldErrors } from "@/lib/auth/formErrors";
import { PixelTownScene } from "../_components/PixelTownScene";

function t(key: TranslationKey) {
  return translate(DEFAULT_LOCALE, key);
}

export function LoginForm() {
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
      email: formData.get("email"),
      password: formData.get("password"),
    };

    const clientCheck = teacherLoginSchema.safeParse(input);
    if (!clientCheck.success) {
      setFieldErrors(toFieldErrors(clientCheck.error));
      return;
    }

    startTransition(async () => {
      try {
        const result = await signInTeacher(input);
        if (!result.success) {
          setFormError(result.error);
          setFieldErrors(result.fieldErrors ?? {});
          return;
        }
        router.push("/teacher");
        router.refresh();
      } catch {
        setFormError(t("auth.login.genericError"));
      }
    });
  }

  return (
    <div className="flex min-h-screen flex-col bg-sky-light">
      <Header />
      <div className="h-24 w-full bg-sky-light sm:h-32">
        <PixelTownScene className="mx-auto h-full max-w-2xl" />
      </div>
      <main className="flex flex-1 flex-col items-center justify-center gap-6 p-4">
        <div className="flex w-full max-w-sm flex-col items-center gap-1 text-center">
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-ink-900">
            {t("auth.login.title")}
          </h1>
          <p className="text-sm text-ink-600">{t("auth.login.subtitle")}</p>
        </div>

        <Card className="max-w-sm">
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            {formError && <Alert variant="error">{formError}</Alert>}

            <TextField
              label={t("auth.login.emailLabel")}
              name="email"
              type="email"
              autoComplete="email"
              required
              disabled={isPending}
              error={fieldErrors.email}
            />
            <TextField
              label={t("auth.login.passwordLabel")}
              name="password"
              type="password"
              autoComplete="current-password"
              required
              disabled={isPending}
              error={fieldErrors.password}
            />

            <Button type="submit" isLoading={isPending} className="w-full">
              {isPending ? t("auth.login.submitting") : t("auth.login.submit")}
            </Button>
          </form>
        </Card>

        <p className="text-sm text-ink-600">
          {t("auth.login.noAccountPrompt")}{" "}
          <Link
            href="/signup"
            className="rounded-sm font-medium text-wood-800 underline decoration-wood-600 decoration-2 underline-offset-2 hover:text-wood-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
          >
            {t("auth.login.signupLink")}
          </Link>
        </p>
      </main>
    </div>
  );
}
