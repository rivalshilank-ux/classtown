"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, TextField } from "@classtown/ui";
import { classNameSchema } from "@classtown/shared-schema";
import { createClass } from "@/lib/class/teacherActions";

export function CreateClassForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) {
      return;
    }
    setError(null);

    const parsed = classNameSchema.safeParse(name);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "학급 이름을 확인해 주세요.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await createClass(parsed.data);
        if (!result.success) {
          setError(result.error);
          return;
        }
        setName("");
        router.refresh();
      } catch {
        setError("학급을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
      {error && <Alert variant="error">{error}</Alert>}
      <TextField
        label="학급 이름"
        name="name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="예: 5-A"
        maxLength={60}
        disabled={isPending}
        required
      />
      <Button type="submit" isLoading={isPending}>
        {isPending ? "만드는 중..." : "학급 만들기"}
      </Button>
    </form>
  );
}
