import { Badge, Panel } from "@classtown/ui";

interface Stat {
  icon: string;
  label: string;
  value: string;
}

const STATS: Stat[] = [
  { icon: "👥", label: "학생", value: "24" },
  { icon: "🟢", label: "접속 중", value: "12" },
  { icon: "🎮", label: "플레이 중", value: "8" },
  { icon: "📚", label: "활동", value: "3" },
];

export function ClassOverview() {
  return (
    <Panel variant="wood" className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="font-[family-name:var(--font-display)] text-xs tracking-wide text-ink-600">
          YOUR CLASS
        </span>
        <Badge tone="accent">PREVIEW</Badge>
      </div>

      <h2 className="font-[family-name:var(--font-display)] text-2xl text-ink-900">
        3-B
      </h2>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col items-center gap-1 border-2 border-wood-600/40 bg-cream-400 py-3"
          >
            <span className="text-lg">{stat.icon}</span>
            <span className="font-[family-name:var(--font-display)] text-lg text-ink-900">
              {stat.value}
            </span>
            <span className="text-xs text-ink-600">{stat.label}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
