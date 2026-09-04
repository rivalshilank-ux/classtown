import { Header } from "@classtown/ui";
import { DEFAULT_LOCALE, translate } from "@classtown/i18n";

const CTA_FOCUS_RING =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2";

export function LandingHero() {
  const appName = translate(DEFAULT_LOCALE, "common.appName");

  return (
    <div className="flex flex-col">
      <Header />

      <section className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-24 text-center sm:py-32">
        <h1 className="text-4xl font-bold tracking-tight text-neutral-900 sm:text-6xl">
          {appName}, 우리 반이 그대로
          <br />
          만나는 공간이 됩니다
        </h1>
        <p className="max-w-xl text-lg text-neutral-600 sm:text-xl">
          설치 없이 브라우저에서 바로, 선생님과 학생이 실시간으로 함께
          움직이고 만나는 2D 공간. 크롬북에서도 그대로 열립니다.
        </p>

        <div className="flex flex-col items-center gap-3 pt-4 sm:flex-row">
          <a
            href="/signup"
            className={[
              "inline-flex items-center justify-center rounded-lg bg-brand-700 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-brand-800",
              CTA_FOCUS_RING,
            ].join(" ")}
          >
            무료로 시작하기
          </a>
          <a
            href="/play"
            className={[
              "inline-flex items-center justify-center rounded-lg bg-neutral-100 px-6 py-3 text-base font-medium text-neutral-900 transition-colors hover:bg-neutral-200",
              CTA_FOCUS_RING,
            ].join(" ")}
          >
            게스트로 바로 플레이
          </a>
        </div>
      </section>
    </div>
  );
}
