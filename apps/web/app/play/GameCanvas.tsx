"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createGameClient, type ConnectionStatus } from "@classtown/game-client";
import { Logo, PixelIcon } from "@classtown/ui";
import { clearStudentSession, clearStudentTicket, getStudentSession } from "@/lib/student/session";

const GAME_SERVER_URL =
  process.env.NEXT_PUBLIC_GAME_SERVER_URL ?? "ws://localhost:2567";

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  connecting: "서버에 연결하는 중...",
  connected: "서버에 연결됨...",
  joining: "룸에 입장하는 중...",
  joined: "",
  error: "연결에 실패했습니다.",
  disconnected: "연결이 끊어졌습니다.",
};

export function GameCanvas() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [error, setError] = useState<string | null>(null);

  // Read once, on mount. There is no nickname-only fallback any more: without a
  // ticket there is no way to prove which class this player belongs to, so the
  // only correct move is to send them back to the entry form.
  const [session] = useState(() => getStudentSession());
  const ticketId = session?.ticketId ? session.ticketId : null;

  useEffect(() => {
    if (ticketId === null) {
      router.replace("/student");
    }
  }, [ticketId, router]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || ticketId === null) {
      return;
    }

    // A ticket is single-use, so it is spent as soon as we hand it over. Keeping
    // it around would only let a refresh retry a join that can no longer succeed.
    clearStudentTicket();

    const handle = createGameClient(container, {
      endpoint: GAME_SERVER_URL,
      joinOptions: { ticket: ticketId },
      onStatusChange: setStatus,
      onError: setError,
    });

    return () => {
      handle.destroy();
    };
  }, [ticketId]);

  if (ticketId === null) {
    return <div className="min-h-screen bg-sky-light" />;
  }

  const showOverlay = status !== "joined";
  const isRecoverable = status === "error" || status === "disconnected";

  function handleLeave() {
    clearStudentSession();
    router.push("/student/home");
  }

  return (
    <div className="relative h-screen w-screen bg-ink-900">
      <div ref={containerRef} className="h-full w-full" />
      <div className="pixel-corners-sm pointer-events-none absolute left-3 top-3 z-10 border-2 border-ink-900 bg-wood-800/95 px-2 py-1">
        <Logo size="sm" />
      </div>
      {!showOverlay && session && (
        <div className="pixel-corners-sm absolute right-3 top-3 z-10 flex items-center gap-2 border-2 border-ink-900 bg-wood-800/95 py-1 pl-3 pr-1">
          <span className="font-[family-name:var(--font-display)] text-sm text-cream-400">
            {session.nickname}
          </span>
          <button
            type="button"
            onClick={handleLeave}
            aria-label="학교에서 나가기"
            title="학교에서 나가기"
            className="pixel-corners-sm flex items-center justify-center border-2 border-ink-900 bg-cream-400 p-1 text-wood-800 transition-colors hover:bg-cream-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
          >
            <PixelIcon name="house" size={16} />
          </button>
        </div>
      )}
      {showOverlay && (
        <div className="absolute inset-0 flex items-center justify-center bg-ink-900/70">
          <div className="pixel-corners flex flex-col items-center gap-3 border-4 border-wood-900 bg-cream-500 px-6 py-4 text-center shadow-[0_5px_0_0_#3a2415]">
            <p className="font-[family-name:var(--font-display)] text-base text-ink-900">
              {error ?? STATUS_LABEL[status]}
            </p>
            {isRecoverable && (
              <button
                type="button"
                onClick={() => router.replace("/student")}
                className="pixel-corners border-2 border-ink-900 bg-accent-500 px-4 py-2 font-[family-name:var(--font-display)] text-sm text-ink-900 shadow-[0_3px_0_0_#3a2415] transition-[transform,box-shadow] hover:bg-accent-600 active:translate-y-[2px] active:shadow-[0_1px_0_0_#3a2415] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
              >
                다시 입장하기
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
