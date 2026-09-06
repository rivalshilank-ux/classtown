import { Badge, Card } from "@classtown/ui";
import { listStudents, STUDENTS_PAGE_SIZE, type StudentStatusFilter } from "@/lib/admin/students";
import { PaginationControls } from "../PaginationControls";

export const dynamic = "force-dynamic";

const INPUT_CLASSES =
  "pixel-corners-sm border-2 border-wood-600 bg-cream-400 px-3 py-1.5 text-sm text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600";
const SUBMIT_CLASSES =
  "pixel-corners-sm border-2 border-ink-900 bg-accent-500 px-4 py-1.5 font-[family-name:var(--font-display)] text-sm text-ink-900 hover:bg-accent-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";

interface StudentsPageProps {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}

function isStatusFilter(value: string | undefined): value is StudentStatusFilter {
  return value === "active" || value === "removed" || value === "transferred";
}

const STATUS_LABEL: Record<StudentStatusFilter, string> = {
  all: "전체",
  active: "활동 중",
  removed: "제거됨",
  transferred: "이전됨",
};

export default async function AdminStudentsPage({ searchParams }: StudentsPageProps) {
  const { q, status: statusParam, page: pageParam } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
  const status: StudentStatusFilter = isStatusFilter(statusParam) ? statusParam : "all";
  const { items, total } = await listStudents({ page, search: q, status });
  const totalPages = Math.max(1, Math.ceil(total / STUDENTS_PAGE_SIZE));

  return (
    <>
      <div className="flex flex-col gap-1">
        <span className="font-[family-name:var(--font-display)] text-xs tracking-wide text-ink-600">
          ADMIN
        </span>
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-ink-900 sm:text-3xl">
          Students
        </h1>
        <p className="text-sm text-ink-600">전체 {total.toLocaleString("ko-KR")}명</p>
      </div>

      <form method="GET" className="flex flex-wrap gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="닉네임으로 검색"
          className={INPUT_CLASSES}
        />
        <select name="status" defaultValue={status} className={INPUT_CLASSES}>
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button type="submit" className={SUBMIT_CLASSES}>
          검색
        </button>
      </form>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b-2 border-wood-600/40 text-xs text-ink-600">
              <th className="px-4 py-3 font-normal">닉네임</th>
              <th className="px-4 py-3 font-normal">학급</th>
              <th className="px-4 py-3 font-normal">상태</th>
              <th className="px-4 py-3 font-normal">접속</th>
              <th className="px-4 py-3 font-normal">레벨</th>
              <th className="px-4 py-3 font-normal">XP</th>
            </tr>
          </thead>
          <tbody>
            {items.map((student) => (
              <tr key={student.id} className="border-b-2 border-wood-600/20 last:border-b-0">
                <td className="px-4 py-3 text-ink-900">{student.nickname}</td>
                <td className="px-4 py-3 text-ink-600">{student.className}</td>
                <td className="px-4 py-3">
                  <Badge tone={student.status === "active" ? "good" : "wood"}>
                    {STATUS_LABEL[student.status]}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  {student.online ? (
                    <Badge tone="accent">접속 중</Badge>
                  ) : (
                    <span className="text-ink-600">
                      {student.lastSeenAt
                        ? new Date(student.lastSeenAt).toLocaleString("ko-KR")
                        : "기록 없음"}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-ink-600">{student.level}</td>
                <td className="px-4 py-3 text-ink-600">{student.xp.toLocaleString("ko-KR")}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-ink-600">
                  표시할 학생이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <PaginationControls
        page={page}
        totalPages={totalPages}
        basePath="/admin/students"
        query={{ q, status: status === "all" ? undefined : status }}
      />
    </>
  );
}
