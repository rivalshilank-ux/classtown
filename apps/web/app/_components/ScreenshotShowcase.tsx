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
      <div className="overflow-hidden rounded-2xl bg-neutral-100 shadow-xl sm:rounded-3xl">
        <img
          src={src}
          alt={alt}
          width={1440}
          height={900}
          className="h-auto w-full"
        />
      </div>
      <figcaption className="text-center text-sm text-neutral-600">{caption}</figcaption>
    </figure>
  );
}

export function ScreenshotShowcase() {
  const [main, ...rest] = SCREENSHOTS;

  return (
    <section className="px-4 py-24 sm:py-32">
      <div className="mx-auto flex max-w-5xl flex-col gap-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
            실제 화면 그대로
          </h2>
          <p className="mt-3 text-lg text-neutral-600">
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
