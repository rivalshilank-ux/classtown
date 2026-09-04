"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Alert, Button, TextField } from "@classtown/ui";
import { DEFAULT_LOCALE, translate, type TranslationKey } from "@classtown/i18n";
import { teacherSignupSchema } from "@classtown/shared-schema";
import { signUpTeacher } from "@/lib/auth/teacherActions";
import { toFieldErrors } from "@/lib/auth/formErrors";

function t(key: TranslationKey) {
  return translate(DEFAULT_LOCALE, key);
}

export function SignupForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) {
      return;
    }
    setFormError(null);
    setSuccessMessage(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const input = {
      name: formData.get("name"),
      schoolName: formData.get("schoolName"),
      email: formData.get("email"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    };

    const clientCheck = teacherSignupSchema.safeParse(input);
    if (!clientCheck.success) {
      setFieldErrors(toFieldErrors(clientCheck.error));
      return;
    }

    startTransition(async () => {
      try {
        const result = await signUpTeacher(input);
        if (!result.success) {
          setFormError(result.error);
          setFieldErrors(result.fieldErrors ?? {});
          return;
        }

        if (result.requiresEmailConfirmation) {
          setSuccessMessage(t("auth.signup.successConfirmEmail"));
          return;
        }

        setSuccessMessage(t("auth.signup.successAutoLogin"));
        router.push("/teacher");
        router.refresh();
      } catch {
        setFormError(t("auth.signup.genericError"));
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex w-full max-w-sm flex-col gap-4"
    >
      <h1 className="text-xl font-bold text-neutral-900">{t("auth.signup.title")}</h1>

      {formError && <Alert variant="error">{formError}</Alert>}
      {successMessage && <Alert variant="success">{successMessage}</Alert>}

      <TextField
        label={t("auth.signup.nameLabel")}
        name="name"
        autoComplete="name"
        required
        disabled={isPending}
        error={fieldErrors.name}
      />
      <TextField
        label={t("auth.signup.schoolNameLabel")}
        name="schoolName"
        autoComplete="organization"
        required
        disabled={isPending}
        error={fieldErrors.schoolName}
      />
      <TextField
        label={t("auth.signup.emailLabel")}
        name="email"
        type="email"
        autoComplete="email"
        required
        disabled={isPending}
        error={fieldErrors.email}
      />
      <TextField
        label={t("auth.signup.passwordLabel")}
        name="password"
        type="password"
        autoComplete="new-password"
        required
        disabled={isPending}
        error={fieldErrors.password}
      />
      <TextField
        label={t("auth.signup.confirmPasswordLabel")}
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        disabled={isPending}
        error={fieldErrors.confirmPassword}
      />

      <Button type="submit" disabled={isPending}>
        {isPending ? t("auth.signup.submitting") : t("auth.signup.submit")}
      </Button>

      <p className="text-sm text-neutral-900">
        {t("auth.signup.hasAccountPrompt")}{" "}
        <Link href="/login" className="font-medium text-brand-500 hover:underline">
          {t("auth.signup.loginLink")}
        </Link>
      </p>
    </form>
  );
}
