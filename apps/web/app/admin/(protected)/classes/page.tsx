import { Badge, Card } from "@classtown/ui";
import { listClasses, CLASSES_PAGE_SIZE, type ClassStatusFilter } from "@/lib/admin/classes";
import { PaginationControls } from "../PaginationControls";

export const dynamic = "force-dynamic";

const INPUT_CLASSES =
  "pixel-corners-sm border-2 border-wood-600 bg-cream-400 px-3 py-1.5 text-sm text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600";
const SUBMIT_CLASSES =
  "pixel-corners-sm border-2 border-ink-900 bg-accent-500 px-4 py-1.5 font-[family-name:var(--font-display)] text-sm text-ink-900 hover:bg-accent-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";

interface ClassesPageProps {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}

function isStatusFilter(value: string | undefined): value is ClassStatusFilter {
  return value === "active" || value === "archived";
}

export default async function AdminClassesPage({ searchParams }: ClassesPageProps) {
  const { q, status: statusParam, page: pageParam } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
  const status: ClassStatusFilter = isStatusFilter(statusParam) ? statusParam : "all";
  const { items, total } = await listClasses({ page, search: q, status });
  const totalPages = Math.max(1, Math.ceil(total / CLASSES_PAGE_SIZE));

  return (
    <>
      <div className="flex flex-col gap-1">
        <span className="font-[family-name:var(--font-display)] text-xs tracking-wide text-ink-600">
          ADMIN
        </span>
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-ink-900 sm:text-3xl">
          Classes
        </h1>
        <p className="text-sm text-ink-600">전체 {total.toLocaleString("ko-KR")}개</p>
      </div>

      <form method="GET" className="flex flex-wrap gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="학급 이름으로 검색"
          className={INPUT_CLASSES}
        />
        <select name="status" defaultValue={status} className={INPUT_CLASSES}>
          <option value="all">전체</option>
          <option value="active">활성</option>
          <option value="archived">보관됨</option>
        </select>
        <button type="submit" className={SUBMIT_CLASSES}>
          검색
        </button>
      </form>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b-2 border-wood-600/40 text-xs text-ink-600">
              <th className="px-4 py-3 font-normal">학급명</th>
              <th className="px-4 py-3 font-normal">참가 코드</th>
              <th className="px-4 py-3 font-normal">담당 교사</th>
              <th className="px-4 py-3 font-normal">상태</th>
              <th className="px-4 py-3 font-normal">학생 수</th>
              <th className="px-4 py-3 font-normal">생성일</th>
            </tr>
          </thead>
          <tbody>
            {items.map((classItem) => (
              <tr key={classItem.id} className="border-b-2 border-wood-600/20 last:border-b-0">
                <td className="px-4 py-3 text-ink-900">{classItem.name}</td>
                <td className="px-4 py-3 font-mono text-ink-600">{classItem.classCode}</td>
                <td className="px-4 py-3 text-ink-600">
                  {classItem.teacherName}
                  {classItem.teacherSchool && (
                    <span className="text-ink-600/60"> · {classItem.teacherSchool}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={classItem.status === "active" ? "good" : "wood"}>
                    {classItem.status === "active" ? "활성" : "보관됨"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-ink-600">{classItem.studentCount}</td>
                <td className="px-4 py-3 text-ink-600">
                  {new Date(classItem.createdAt).toLocaleDateString("ko-KR")}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-ink-600">
                  표시할 학급이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <PaginationControls
        page={page}
        totalPages={totalPages}
        basePath="/admin/classes"
        query={{ q, status: status === "all" ? undefined : status }}
      />
    </>
  );
}
