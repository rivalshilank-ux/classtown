export function FinalCta() {
  return (
    <section className="bg-grass-dark px-4 py-20 text-center sm:py-24">
      <div className="mx-auto flex max-w-xl flex-col items-center gap-6">
        <h2 className="font-[family-name:var(--font-display)] text-3xl text-cream-400 sm:text-4xl">
          지금 바로 열어보세요
        </h2>
        <p className="text-base text-cream-400/85 sm:text-lg">
          가입 없이 게스트로 먼저 둘러보고, 준비되면 교사 계정을 만드세요.
        </p>
        <a
          href="/signup"
          className="pixel-corners inline-flex items-center justify-center border-2 border-ink-900 bg-accent-500 px-6 py-3 font-[family-name:var(--font-display)] text-base text-ink-900 shadow-[0_4px_0_0_#2a2015] transition-[transform,box-shadow] hover:bg-accent-600 active:translate-y-[3px] active:shadow-[0_1px_0_0_#2a2015] focus:outline-none focus-visible:ring-2 focus-visible:ring-cream-400 focus-visible:ring-offset-2 focus-visible:ring-offset-grass-dark"
        >
          무료로 시작하기
        </a>
      </div>
    </section>
  );
}
