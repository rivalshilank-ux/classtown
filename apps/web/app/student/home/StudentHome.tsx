"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Badge,
  Button,
  Header,
  Panel,
  PixelIcon,
  type PixelGlyphName,
} from "@classtown/ui";
import { formatEntryCode, XP_PER_LEVEL } from "@classtown/shared-schema";
import { getMyProgress, joinClass } from "@/lib/class/studentActions";
import {
  clearStudentSession,
  getStudentSession,
  saveStudentSession,
  type StudentSession,
} from "@/lib/student/session";

interface ComingSoonTile {
  icon: PixelGlyphName;
  label: string;
}

const COMING_SOON_TILES: ComingSoonTile[] = [
  { icon: "backpack", label: "인벤토리" },
  { icon: "map", label: "지도" },
  { icon: "friend", label: "친구" },
];

function ComingSoonTileCard({ icon, label }: ComingSoonTile) {
  return (
    <div
      aria-disabled="true"
      className="pixel-corners flex flex-col items-center gap-2 border-2 border-wood-600/50 bg-cream-500/60 px-3 py-4 text-center opacity-70"
    >
      <PixelIcon name={icon} size={28} className="text-ink-600" />
      <span className="font-[family-name:var(--font-display)] text-sm text-ink-600">
        {label}
      </span>
      <Badge tone="wood" className="whitespace-nowrap">
        준비 중
      </Badge>
    </div>
  );
}

export function StudentHome() {
  const router = useRouter();
  const [session] = useState<StudentSession | null>(() => getStudentSession());
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ xp: number; level: number } | null>(null);

  useEffect(() => {
    if (!session) {
      router.replace("/student");
    }
  }, [session, router]);

  // Read-only: this never sends xp/level anywhere, only fetches what the
  // game server has already written from real play time (see
  // packages/shared-schema/src/progression.ts). Failing silently here is
  // deliberate -- a stale "레벨 정보 없음" badge is not worth an error banner
  // on a page whose main job is the Play button.
  useEffect(() => {
    if (!session) {
      return;
    }
    let cancelled = false;
    void getMyProgress({
      classCode: session.classCode,
      participantCode: session.participantCode,
    }).then((result) => {
      if (!cancelled && result.success) {
        setProgress({ xp: result.xp, level: result.level });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [session]);

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col bg-sky-light">
        <Header />
      </div>
    );
  }

  /**
   * A join ticket is single-use, so pressing Play mints a fresh one rather than
   * reusing whatever is in storage. The participant code is what makes this the
   * same character every time instead of a new student on each entry.
   */
  function handlePlay() {
    if (isPending || !session) {
      return;
    }
    setError(null);

    startTransition(async () => {
      try {
        const result = await joinClass({
          classCode: session.classCode,
          participantCode: session.participantCode,
        });

        if (!result.success) {
          setError(result.error);
          return;
        }

        saveStudentSession({
          ticketId: result.ticketId,
          nickname: result.nickname,
          participantCode: result.participantCode,
          classCode: result.classCode,
        });
        router.push("/play");
      } catch {
        setError("지금은 입장할 수 없습니다. 잠시 후 다시 시도해 주세요.");
      }
    });
  }

  return (
    <div className="flex min-h-screen flex-col bg-sky-light">
      <Header />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4 py-8">
        <Panel variant="wood" className="flex flex-col items-center gap-4 text-center">
          <Badge tone="accent">{formatEntryCode(session.classCode)}</Badge>

          <div className="flex flex-col items-center gap-1">
            <h1 className="font-[family-name:var(--font-display)] text-3xl text-ink-900">
              {session.nickname}
            </h1>
            <p className="text-sm text-ink-600">
              My ClassTown — 오늘도 친구들과 학교에서 만나요.
            </p>
          </div>

          <div className="flex w-full flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-[family-name:var(--font-display)] text-xs tracking-wide text-ink-600">
                <PixelIcon name="star" size={16} className="text-accent-600" />
                레벨 &amp; 경험치
              </span>
              <Badge tone="accent" className="whitespace-nowrap">
                {progress ? `Lv.${progress.level}` : "불러오는 중"}
              </Badge>
            </div>
            {(() => {
              const xpIntoLevel = progress ? progress.xp % XP_PER_LEVEL : 0;
              const xpPercent = progress ? Math.round((xpIntoLevel / XP_PER_LEVEL) * 100) : 0;
              return (
                <>
                  <div
                    role="progressbar"
                    aria-valuenow={xpPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={
                      progress
                        ? `경험치 ${xpIntoLevel} / ${XP_PER_LEVEL}`
                        : "경험치 불러오는 중"
                    }
                    className="pixel-corners-sm h-3 w-full overflow-hidden border-2 border-wood-900 bg-cream-400"
                  >
                    <div
                      className="h-full bg-accent-500 transition-[width]"
                      style={{ width: `${xpPercent}%` }}
                    />
                  </div>
                  {progress && (
                    <span className="text-right text-xs text-ink-600">
                      {xpIntoLevel} / {XP_PER_LEVEL} XP
                    </span>
                  )}
                </>
              );
            })()}
          </div>

          {error && (
            <Alert variant="error" className="w-full text-left">
              {error}
            </Alert>
          )}

          <Button
            type="button"
            onClick={handlePlay}
            disabled={isPending}
            isLoading={isPending}
            size="lg"
            className="w-full"
          >
            <span>🏫 {isPending ? "입장하는 중..." : "PLAY CLASSTOWN"}</span>
            <span className="text-sm font-normal tracking-normal text-ink-900/80">
              학교 세계로 입장하기
            </span>
          </Button>
        </Panel>

        <Panel variant="paper" className="flex flex-col gap-1 text-center">
          <span className="font-[family-name:var(--font-display)] text-xs tracking-wide text-ink-600">
            내 학생 코드
          </span>
          <span className="font-[family-name:var(--font-display)] text-2xl tracking-widest text-ink-900">
            {formatEntryCode(session.participantCode)}
          </span>
          <span className="text-xs text-ink-600">
            다음에 들어올 때 이 코드로 같은 캐릭터를 이어서 플레이할 수 있어요.
          </span>
        </Panel>

        <div className="grid grid-cols-3 gap-3">
          {COMING_SOON_TILES.map((tile) => (
            <ComingSoonTileCard key={tile.label} {...tile} />
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            clearStudentSession();
            router.push("/student");
          }}
          className="mx-auto rounded-sm text-sm font-medium text-wood-800 underline decoration-wood-600 decoration-2 underline-offset-2 hover:text-wood-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
        >
          다른 참가 코드로 다시 입장하기
        </button>
      </main>
    </div>
  );
}
