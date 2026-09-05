import { Badge, Panel } from "@classtown/ui";

interface Zone {
  name: string;
  count: number;
}

const ZONES: Zone[] = [
  { name: "🏫 학교", count: 12 },
  { name: "🌳 운동장", count: 7 },
  { name: "📚 도서관", count: 3 },
];

export function WorldStatus() {
  return (
    <Panel variant="board" className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="font-[family-name:var(--font-display)] text-xs tracking-wide text-cream-400/70">
          CLASSTOWN LIVE
        </span>
        <Badge tone="accent">PREVIEW</Badge>
      </div>

      <ul className="flex flex-col gap-3">
        {ZONES.map((zone) => (
          <li
            key={zone.name}
            className="flex items-center justify-between border-b border-cream-400/20 pb-3 last:border-0 last:pb-0"
          >
            <span className="font-[family-name:var(--font-display)] text-sm text-cream-400">
              {zone.name}
            </span>
            <span className="flex items-center gap-2 text-sm text-cream-400/80">
              <span className="h-2 w-2 rounded-full bg-good" aria-hidden="true" />
              {zone.count}명
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
