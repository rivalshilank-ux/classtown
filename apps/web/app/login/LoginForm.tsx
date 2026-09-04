"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Alert, Button, TextField } from "@classtown/ui";
import { DEFAULT_LOCALE, translate, type TranslationKey } from "@classtown/i18n";
import { teacherLoginSchema } from "@classtown/shared-schema";
import { signInTeacher } from "@/lib/auth/teacherActions";
import { toFieldErrors } from "@/lib/auth/formErrors";

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

    // Fast client-side feedback using the same schema the server
    // re-validates with — skip the network round trip if it's already
    // invalid, but never treat this as the enforcement point.
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
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex w-full max-w-sm flex-col gap-4"
    >
      <h1 className="text-xl font-bold text-neutral-900">{t("auth.login.title")}</h1>

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

      <Button type="submit" disabled={isPending}>
        {isPending ? t("auth.login.submitting") : t("auth.login.submit")}
      </Button>

      <p className="text-sm text-neutral-900">
        {t("auth.login.noAccountPrompt")}{" "}
        <Link href="/signup" className="font-medium text-brand-500 hover:underline">
          {t("auth.login.signupLink")}
        </Link>
      </p>
    </form>
  );
}
