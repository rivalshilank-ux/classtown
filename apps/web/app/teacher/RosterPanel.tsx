import { Badge, Panel } from "@classtown/ui";
import { formatEntryCode } from "@classtown/shared-schema";
import type { RosterEntry } from "@classtown/shared-types";
import { ONLINE_WINDOW_MS } from "@/lib/class/queries";

interface RosterPanelProps {
  roster: RosterEntry[];
}

function isOnline(lastSeenAt: string | null): boolean {
  return lastSeenAt !== null && Date.parse(lastSeenAt) > Date.now() - ONLINE_WINDOW_MS;
}

export function RosterPanel({ roster }: RosterPanelProps) {
  return (
    <Panel variant="paper" className="flex flex-col gap-3">
      <span className="font-[family-name:var(--font-display)] text-xs tracking-wide text-ink-600">
        STUDENTS
      </span>

      {roster.length === 0 ? (
        <p className="py-2 text-sm text-ink-600">
          아직 입장한 학생이 없어요. 참가 코드를 학생들에게 알려주세요.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {roster.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between gap-3 border-b border-wood-600/25 pb-2 last:border-0 last:pb-0"
            >
              <span className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full ${
                    isOnline(entry.lastSeenAt) ? "bg-good" : "bg-stone"
                  }`}
                />
                <span className="text-sm font-medium text-ink-900">
                  {entry.nickname}
                </span>
              </span>
              <span className="flex items-center gap-3">
                <span className="font-[family-name:var(--font-display)] text-xs tracking-widest text-ink-600">
                  {formatEntryCode(entry.participantCode)}
                </span>
                <Badge tone="wood" className="whitespace-nowrap">
                  Lv.{entry.level}
                </Badge>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
