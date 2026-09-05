"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, Header, TextField } from "@classtown/ui";
import { joinRoomOptionsSchema } from "@classtown/shared-schema";
import { saveStudentSession } from "@/lib/student/session";
import { toFieldErrors } from "@/lib/auth/formErrors";
import { PixelTownScene } from "../_components/PixelTownScene";

function generateGuestNickname() {
  return `Guest-${Math.floor(Math.random() * 10000)}`;
}

export function StudentEntryForm() {
  const router = useRouter();
  const [nickname, setNickname] = useState(() => generateGuestNickname());
  const [classCode, setClassCode] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const input = { classCode: classCode.trim(), nickname: nickname.trim() };
    const parsed = joinRoomOptionsSchema.safeParse({
      joinCode: input.classCode,
      nickname: input.nickname,
    });

    if (!parsed.success) {
      const errors = toFieldErrors(parsed.error);
      setFieldErrors({
        classCode: errors.joinCode ?? "",
        nickname: errors.nickname ?? "",
      });
      return;
    }

    setFieldErrors({});
    saveStudentSession(input);
    router.push("/student/home");
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
            <TextField
              label="참가 코드"
              name="classCode"
              value={classCode}
              onChange={(event) => setClassCode(event.target.value)}
              placeholder="예: DEVROOM1"
              maxLength={12}
              autoComplete="off"
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
              required
              error={fieldErrors.nickname || undefined}
            />
            <Button type="submit" className="w-full">
              다음
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
