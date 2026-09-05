import Link from "next/link";
import { Badge, Header } from "@classtown/ui";
import { DEFAULT_LOCALE, translate } from "@classtown/i18n";
import { PixelTownScene } from "./PixelTownScene";

export function LandingHero() {
  const appName = translate(DEFAULT_LOCALE, "common.appName");

  return (
    <div className="flex flex-col bg-sky-light">
      <Header />

      <section className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-10 px-4 py-16 sm:py-20 lg:grid-cols-2 lg:gap-6">
        <div className="flex flex-col items-center gap-5 text-center lg:items-start lg:text-left">
          <Badge tone="accent">지금 베타 플레이 중</Badge>

          <h1 className="font-[family-name:var(--font-display)] text-3xl leading-tight text-ink-900 sm:text-4xl lg:text-[2.75rem]">
            {appName}, 우리 반이 그대로 만나는 공간이 됩니다
          </h1>
          <p className="max-w-xl text-base text-ink-600 sm:text-lg">
            설치 없이 브라우저에서 바로, 선생님과 학생이 실시간으로 함께
            움직이고 만나는 2D 공간. 크롬북에서도 그대로 열립니다.
          </p>

          <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row">
            <Link
              href="/signup"
              className="pixel-corners inline-flex items-center justify-center border-2 border-ink-900 bg-accent-500 px-6 py-3 font-[family-name:var(--font-display)] text-base text-ink-900 shadow-[0_4px_0_0_#3a2415] transition-[transform,box-shadow] hover:bg-accent-600 active:translate-y-[3px] active:shadow-[0_1px_0_0_#3a2415] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 focus-visible:ring-offset-sky-light"
            >
              교사로 시작하기
            </Link>
            <Link
              href="/student"
              className="pixel-corners inline-flex items-center justify-center border-2 border-wood-900 bg-wood-600 px-6 py-3 font-[family-name:var(--font-display)] text-base text-cream-400 shadow-[0_4px_0_0_#3a2415] transition-[transform,box-shadow] hover:bg-wood-700 active:translate-y-[3px] active:shadow-[0_1px_0_0_#3a2415] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 focus-visible:ring-offset-sky-light"
            >
              🎒 학생으로 시작하기
            </Link>
          </div>
        </div>

        <div className="pixel-corners w-full max-w-md justify-self-center border-4 border-wood-900 bg-white shadow-[0_6px_0_0_#3a2415] lg:justify-self-end">
          <PixelTownScene className="h-full w-full" />
        </div>
      </section>
    </div>
  );
}
