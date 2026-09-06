import { Badge, Panel, StatTile, StatusDot } from "@classtown/ui";
import { formatEntryCode } from "@classtown/shared-schema";
import type { ClassRecord, ClassSummary } from "@classtown/shared-types";

interface ClassOverviewProps {
  classRecord: ClassRecord;
  summary: ClassSummary;
}

export function ClassOverview({ classRecord, summary }: ClassOverviewProps) {
  return (
    <Panel variant="wood" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <span className="font-[family-name:var(--font-display)] text-xs tracking-wide text-ink-600">
          YOUR CLASS
        </span>
        <Badge tone={classRecord.joinOpen ? "good" : "wood"}>
          {classRecord.joinOpen ? "입장 열림" : "입장 닫힘"}
        </Badge>
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-ink-900">
          {classRecord.name}
        </h2>
        <span className="font-[family-name:var(--font-display)] text-lg tracking-widest text-wood-800">
          {formatEntryCode(classRecord.classCode)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatTile icon="friend" value={summary.studentCount} label="학생" />
        <StatTile
          indicator={<StatusDot tone={summary.onlineCount > 0 ? "good" : "stone"} />}
          value={summary.onlineCount}
          label="접속 중"
        />
      </div>
    </Panel>
  );
}
