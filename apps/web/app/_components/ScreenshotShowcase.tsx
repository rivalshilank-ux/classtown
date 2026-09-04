interface Screenshot {
  src: string;
  alt: string;
  caption: string;
}

const SCREENSHOTS: Screenshot[] = [
  {
    src: "/screenshots/play.png",
    alt: "ClassTown 게임 화면 — 실시간으로 함께 움직이는 플레이어들",
    caption: "실시간 플레이 화면",
  },
  {
    src: "/screenshots/login.png",
    alt: "ClassTown 로그인 화면",
    caption: "로그인",
  },
  {
    src: "/screenshots/signup.png",
    alt: "ClassTown 교사 회원가입 화면",
    caption: "교사 회원가입",
  },
];

function ScreenshotCard({ src, alt, caption }: Screenshot) {
  return (
    <figure className="flex flex-col gap-3">
      <div className="pixel-corners overflow-hidden border-4 border-wood-900 bg-cream-500 shadow-[0_5px_0_0_#3a2415]">
        <img
          src={src}
          alt={alt}
          width={1440}
          height={900}
          className="h-auto w-full"
        />
      </div>
      <figcaption className="text-center font-[family-name:var(--font-display)] text-sm text-ink-600">
        {caption}
      </figcaption>
    </figure>
  );
}

export function ScreenshotShowcase() {
  const [main, ...rest] = SCREENSHOTS;

  return (
    <section className="bg-wood-800 px-4 py-20 sm:py-24">
      <div className="mx-auto flex max-w-5xl flex-col gap-12">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-[family-name:var(--font-display)] text-3xl text-cream-400 sm:text-4xl">
            실제 화면 그대로
          </h2>
          <p className="mt-3 text-base text-cream-400/80">
            과장된 목업이 아닌, 지금 배포되어 있는 화면입니다.
          </p>
        </div>

        {main && <ScreenshotCard {...main} />}

        {rest.length > 0 && (
          <div className="grid gap-10 sm:grid-cols-2">
            {rest.map((shot) => (
              <ScreenshotCard key={shot.src} {...shot} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
