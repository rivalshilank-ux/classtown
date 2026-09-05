"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { createGameClient, type ConnectionStatus } from "@classtown/game-client";
import {
  joinRoomOptionsSchema,
  type JoinRoomOptionsInput,
} from "@classtown/shared-schema";
import { Button, Card, Header, Logo, TextField } from "@classtown/ui";
import { getStudentSession } from "@/lib/student/session";

const GAME_SERVER_URL =
  process.env.NEXT_PUBLIC_GAME_SERVER_URL ?? "ws://localhost:2567";
const JOIN_CODE = "DEVROOM1";

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  connecting: "서버에 연결하는 중...",
  connected: "서버에 연결됨...",
  joining: "룸에 입장하는 중...",
  joined: "",
  error: "연결에 실패했습니다.",
  disconnected: "연결이 끊어졌습니다.",
};

function generateGuestNickname() {
  return `Guest-${Math.floor(Math.random() * 10000)}`;
}

function EntryScreen({
  onEnter,
}: {
  onEnter: (nickname: string) => void;
}) {
  const [nickname, setNickname] = useState(() => generateGuestNickname());
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = joinRoomOptionsSchema.shape.nickname.safeParse(nickname.trim());
    if (!parsed.success) {
      setError("닉네임은 1~20자로 입력해 주세요.");
      return;
    }

    setError(null);
    onEnter(parsed.data);
  }

  return (
    <div className="flex min-h-screen flex-col bg-sky-light">
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center gap-6 p-4">
        <div className="flex w-full max-w-sm flex-col items-center gap-1 text-center">
          <h1 className="font-[family-name:var(--font-display)] text-2xl text-ink-900 sm:text-3xl">
            닉네임을 입력하고 입장하세요
          </h1>
          <p className="text-sm text-ink-600">
            계정 없이 바로 게스트로 플레이할 수 있어요.
          </p>
        </div>

        <Card className="max-w-sm">
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <TextField
              label="닉네임"
              name="nickname"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              maxLength={20}
              autoComplete="off"
              required
              error={error ?? undefined}
            />
            <Button type="submit" className="w-full">
              입장하기
            </Button>
          </form>
        </Card>
      </main>
    </div>
  );
}

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [joinOptions, setJoinOptions] = useState<JoinRoomOptionsInput | null>(
    () => {
      const session = getStudentSession();
      return session
        ? { joinCode: session.classCode, nickname: session.nickname }
        : null;
    },
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || joinOptions === null) {
      return;
    }

    const handle = createGameClient(container, {
      endpoint: GAME_SERVER_URL,
      joinOptions,
      onStatusChange: setStatus,
      onError: setError,
    });

    return () => {
      handle.destroy();
    };
  }, [joinOptions]);

  if (joinOptions === null) {
    return (
      <EntryScreen
        onEnter={(nickname) => setJoinOptions({ joinCode: JOIN_CODE, nickname })}
      />
    );
  }

  const showOverlay = status !== "joined";

  return (
    <div className="relative h-screen w-screen bg-ink-900">
      <div ref={containerRef} className="h-full w-full" />
      <div className="pixel-corners-sm pointer-events-none absolute left-3 top-3 z-10 border-2 border-ink-900 bg-wood-800/95 px-2 py-1">
        <Logo size="sm" />
      </div>
      {showOverlay && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-ink-900/70">
          <div className="pixel-corners border-4 border-wood-900 bg-cream-500 px-6 py-4 text-center shadow-[0_5px_0_0_#3a2415]">
            <p className="font-[family-name:var(--font-display)] text-base text-ink-900">
              {error ?? STATUS_LABEL[status]}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
