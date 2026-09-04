"use client";

import { useEffect, useRef, useState } from "react";
import { createGameClient, type ConnectionStatus } from "@classtown/game-client";
import { Logo } from "@classtown/ui";

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

function useGuestNickname() {
  const [nickname] = useState(() => `Guest-${Math.floor(Math.random() * 10000)}`);
  return nickname;
}

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const nickname = useGuestNickname();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const handle = createGameClient(container, {
      endpoint: GAME_SERVER_URL,
      joinOptions: { joinCode: "DEVROOM1", nickname },
      onStatusChange: setStatus,
      onError: setError,
    });

    return () => {
      handle.destroy();
    };
  }, [nickname]);

  const showOverlay = status !== "joined";

  return (
    <div className="relative h-screen w-screen">
      <div ref={containerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-lg bg-white/90 px-2 py-1 shadow-sm">
        <Logo size="sm" />
      </div>
      {showOverlay && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-neutral-900/60 text-white">
          <p>{error ?? STATUS_LABEL[status]}</p>
        </div>
      )}
    </div>
  );
}
