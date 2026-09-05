import { Panel } from "@classtown/ui";
import type { ActivityEntry } from "@classtown/shared-types";

interface RecentActivityProps {
  activity: ActivityEntry[];
}

const EVENT_LABEL: Record<ActivityEntry["eventType"], string> = {
  joined: "학교에 입장했어요",
  left: "학교에서 나갔어요",
};

function relativeTime(iso: string): string {
  const elapsedMs = Date.now() - Date.parse(iso);
  const minutes = Math.floor(elapsedMs / 60_000);

  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;

  return `${Math.floor(hours / 24)}일 전`;
}

export function RecentActivity({ activity }: RecentActivityProps) {
  return (
    <Panel variant="board" className="flex flex-col gap-3">
      <span className="font-[family-name:var(--font-display)] text-xs tracking-wide text-cream-400/70">
        RECENT ACTIVITY
      </span>

      {activity.length === 0 ? (
        <p className="py-2 text-sm text-cream-400/70">
          아직 활동 기록이 없어요.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {activity.map((item, index) => (
            <li
              key={`${item.occurredAt}-${index}`}
              className="flex items-center justify-between gap-2 text-sm text-cream-400"
            >
              <span>
                {item.nickname}님이 {EVENT_LABEL[item.eventType]}
              </span>
              <span className="shrink-0 text-xs text-cream-400/70">
                {relativeTime(item.occurredAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
