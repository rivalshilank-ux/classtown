"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Alert, Button, Card, Header, TextField } from "@classtown/ui";
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
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center gap-6 p-4 py-8">
        <div className="flex w-full max-w-sm flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">
            {t("auth.signup.title")}
          </h1>
          <p className="text-sm text-neutral-600">{t("auth.signup.subtitle")}</p>
        </div>

        <Card className="max-w-sm">
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
            {formError && <Alert variant="error">{formError}</Alert>}
            {successMessage && <Alert variant="success">{successMessage}</Alert>}

            <fieldset className="flex flex-col gap-4 border-0 p-0">
              <legend className="mb-1 px-0 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {t("auth.signup.profileSection")}
              </legend>
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
            </fieldset>

            <fieldset className="flex flex-col gap-4 border-0 p-0">
              <legend className="mb-1 px-0 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {t("auth.signup.accountSection")}
              </legend>
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
            </fieldset>

            <Button type="submit" isLoading={isPending} className="w-full">
              {isPending ? t("auth.signup.submitting") : t("auth.signup.submit")}
            </Button>
          </form>
        </Card>

        <p className="text-sm text-neutral-600">
          {t("auth.signup.hasAccountPrompt")}{" "}
          <Link
            href="/login"
            className="rounded font-medium text-brand-700 hover:text-brand-800 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2"
          >
            {t("auth.signup.loginLink")}
          </Link>
        </p>
      </main>
    </div>
  );
}
