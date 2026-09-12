"use client";

interface HelpOverlayProps {
  onDismiss: () => void;
}

/**
 * Onboarding per docs/game/tutorial.md's design principles: contextual
 * (points at the interaction markers already visible in the world, not an
 * abstract manual), learn-by-playing (tells the player what to try, not a
 * full rulebook), and revisitable (GameCanvas's "❓" button reopens this on
 * demand -- see docs/game/tutorial.md's "Tutorial replay").
 */
export function HelpOverlay({ onDismiss }: HelpOverlayProps) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-ink-900/70 p-4">
      <div className="pixel-corners flex max-w-sm flex-col gap-3 border-4 border-wood-900 bg-cream-500 p-5 text-center shadow-[0_5px_0_0_#3a2415]">
        <h2 className="font-[family-name:var(--font-display)] text-lg text-ink-900">
          🎒 캠퍼스에 오신 것을 환영해요!
        </h2>
        <ul className="flex flex-col gap-2 text-left text-sm text-ink-700">
          <li>⬆️⬇️⬅️➡️ 방향키(또는 WASD)로 캐릭터를 움직여요.</li>
          <li>✨ 빛나는 표시 근처로 가서 <strong>E</strong> 키를 누르면 살펴볼 수 있어요.</li>
          <li>🧑‍🤝‍🧑 다른 친구들도 같은 공간에 함께 있어요.</li>
          <li>🗺️ 캠퍼스 곳곳의 표시를 모두 찾아보세요!</li>
        </ul>
        <button
          type="button"
          onClick={onDismiss}
          className="pixel-corners self-center border-2 border-ink-900 bg-accent-500 px-4 py-2 font-[family-name:var(--font-display)] text-sm text-ink-900 shadow-[0_3px_0_0_#3a2415] transition-[transform,box-shadow] hover:bg-accent-600 active:translate-y-[2px] active:shadow-[0_1px_0_0_#3a2415] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
        >
          시작하기
        </button>
      </div>
    </div>
  );
}
