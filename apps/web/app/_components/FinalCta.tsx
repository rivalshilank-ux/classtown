const CTA_FOCUS_RING =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2";

export function FinalCta() {
  return (
    <section className="border-t border-neutral-200 bg-neutral-50 px-4 py-24 text-center sm:py-32">
      <div className="mx-auto flex max-w-xl flex-col items-center gap-6">
        <h2 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
          지금 바로 열어보세요
        </h2>
        <p className="text-lg text-neutral-600">
          가입 없이 게스트로 먼저 둘러보고, 준비되면 교사 계정을 만드세요.
        </p>
        <a
          href="/signup"
          className={[
            "inline-flex items-center justify-center rounded-lg bg-brand-700 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-brand-800",
            CTA_FOCUS_RING,
          ].join(" ")}
        >
          무료로 시작하기
        </a>
      </div>
    </section>
  );
}
