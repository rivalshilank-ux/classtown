import { Badge, Panel } from "@classtown/ui";

interface ActivityItem {
  text: string;
  time: string;
}

const ACTIVITY: ActivityItem[] = [
  { text: "민지님이 교실에 입장했어요", time: "방금 전" },
  { text: "Alex님이 운동장에서 놀고 있어요", time: "2분 전" },
  { text: "현우님이 학교에 접속했어요", time: "5분 전" },
];

export function RecentActivity() {
  return (
    <Panel variant="paper" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="font-[family-name:var(--font-display)] text-xs tracking-wide text-ink-600">
          RECENT ACTIVITY
        </span>
        <Badge tone="wood">PREVIEW</Badge>
      </div>

      <ul className="flex flex-col gap-2">
        {ACTIVITY.map((item) => (
          <li
            key={item.text}
            className="flex items-center justify-between gap-2 text-sm text-ink-900"
          >
            <span>{item.text}</span>
            <span className="shrink-0 text-xs text-ink-600">{item.time}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
