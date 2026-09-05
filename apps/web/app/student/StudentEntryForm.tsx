"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Alert, Button, Card, Header, TextField } from "@classtown/ui";
import { classCodeSchema, nicknameSchema } from "@classtown/shared-schema";
import { joinClass } from "@/lib/class/studentActions";
import { saveStudentSession } from "@/lib/student/session";
import { PixelTownScene } from "../_components/PixelTownScene";

function generateGuestNickname() {
  return `Guest-${Math.floor(Math.random() * 10000)}`;
}

export function StudentEntryForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [nickname, setNickname] = useState(() => generateGuestNickname());
  const [classCode, setClassCode] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) {
      return;
    }
    setFormError(null);
    setFieldErrors({});

    // Shape is checked here so an obvious typo doesn't cost a round trip; the
    // code itself is only ever validated against the database, server-side.
    const codeCheck = classCodeSchema.safeParse(classCode);
    const nameCheck = nicknameSchema.safeParse(nickname);

    if (!codeCheck.success || !nameCheck.success) {
      setFieldErrors({
        classCode: codeCheck.success ? "" : (codeCheck.error.issues[0]?.message ?? ""),
        nickname: nameCheck.success ? "" : (nameCheck.error.issues[0]?.message ?? ""),
      });
      return;
    }

    startTransition(async () => {
      try {
        const result = await joinClass({
          classCode: codeCheck.data,
          nickname: nameCheck.data,
        });

        if (!result.success) {
          setFormError(result.error);
          return;
        }

        saveStudentSession({
          ticketId: result.ticketId,
          nickname: result.nickname,
          participantCode: result.participantCode,
          classCode: result.classCode,
        });
        router.push("/student/home");
      } catch {
        setFormError("지금은 입장할 수 없습니다. 잠시 후 다시 시도해 주세요.");
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
            🎒 학급에 입장하기
          </h1>
          <p className="text-sm text-ink-600">
            선생님이 알려준 참가 코드와 닉네임을 입력하세요.
          </p>
        </div>

        <Card className="max-w-sm">
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            {formError && <Alert variant="error">{formError}</Alert>}

            <TextField
              label="참가 코드"
              name="classCode"
              value={classCode}
              onChange={(event) => setClassCode(event.target.value)}
              placeholder="예: ABC-123"
              maxLength={8}
              autoComplete="off"
              autoCapitalize="characters"
              disabled={isPending}
              required
              error={fieldErrors.classCode || undefined}
            />
            <TextField
              label="닉네임"
              name="nickname"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              maxLength={20}
              autoComplete="off"
              disabled={isPending}
              required
              error={fieldErrors.nickname || undefined}
            />
            <Button type="submit" isLoading={isPending} className="w-full">
              {isPending ? "입장하는 중..." : "입장하기"}
            </Button>
          </form>
        </Card>

        <p className="text-sm text-ink-600">
          선생님이신가요?{" "}
          <Link
            href="/login"
            className="rounded-sm font-medium text-wood-800 underline decoration-wood-600 decoration-2 underline-offset-2 hover:text-wood-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
          >
            교사 로그인
          </Link>
        </p>
      </main>
    </div>
  );
}
