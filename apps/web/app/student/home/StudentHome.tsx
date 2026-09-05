"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge, Header, Panel, PixelIcon, type PixelGlyphName } from "@classtown/ui";
import {
  clearStudentSession,
  getStudentSession,
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
      <Badge tone="wood" className="opacity-80">
        준비 중
      </Badge>
    </div>
  );
}

export function StudentHome() {
  const router = useRouter();
  const [session] = useState<StudentSession | null>(() => getStudentSession());

  useEffect(() => {
    if (!session) {
      router.replace("/student");
    }
  }, [session, router]);

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col bg-sky-light">
        <Header />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-sky-light">
      <Header />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4 py-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <Badge tone="accent">{session.classCode}</Badge>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-ink-900">
            환영해요, {session.nickname}님!
          </h1>
          <p className="text-sm text-ink-600">
            My ClassTown — 오늘도 친구들과 학교에서 만나요.
          </p>
        </div>

        <Panel variant="wood" className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <PixelIcon name="star" size={28} className="text-accent-600" />
            <div className="flex flex-col">
              <span className="font-[family-name:var(--font-display)] text-sm text-ink-900">
                레벨 &amp; 경험치
              </span>
              <span className="text-xs text-ink-600">
                캐릭터 성장 시스템은 아직 준비 중이에요.
              </span>
            </div>
          </div>
          <Badge tone="wood" className="shrink-0 whitespace-nowrap">
            준비 중
          </Badge>
        </Panel>

        <Link
          href="/play"
          className="pixel-corners flex flex-col items-center gap-1 border-4 border-ink-900 bg-accent-500 px-6 py-6 text-center shadow-[0_6px_0_0_#3a2415] transition-[transform,box-shadow] hover:bg-accent-600 active:translate-y-[3px] active:shadow-[0_1px_0_0_#3a2415] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 focus-visible:ring-offset-sky-light"
        >
          <span className="font-[family-name:var(--font-display)] text-2xl text-ink-900">
            🏫 PLAY CLASSTOWN
          </span>
          <span className="text-sm text-ink-900/80">학교 세계로 입장하기</span>
        </Link>

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
