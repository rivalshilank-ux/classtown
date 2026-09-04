interface Feature {
  title: string;
  body: string;
}

const FEATURES: Feature[] = [
  {
    title: "설치 없이, 링크 하나로",
    body: "앱을 깔거나 계정을 미리 만들 필요 없이, 브라우저에서 주소만 열면 바로 들어올 수 있습니다. 크롬북에서도 동일하게 동작합니다.",
  },
  {
    title: "실시간으로 함께 움직이는 공간",
    body: "같은 공간에 들어온 학생들이 실시간으로 서로의 위치를 보고, 함께 움직입니다. 위치는 항상 서버가 판정해 모두에게 똑같이 보여집니다.",
  },
  {
    title: "선생님 계정으로 이어지는 수업",
    body: "선생님은 계정을 만들어 로그인 상태를 유지할 수 있습니다. 학급 운영 기능은 계속 추가되는 중입니다.",
  },
];

export function FeatureSection() {
  return (
    <section className="border-t border-neutral-200 bg-white px-4 py-24 sm:py-32">
      <div className="mx-auto grid max-w-5xl gap-12 sm:grid-cols-3">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="flex flex-col gap-3 text-center sm:text-left">
            <h2 className="text-xl font-semibold text-neutral-900">{feature.title}</h2>
            <p className="text-base leading-relaxed text-neutral-600">{feature.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
