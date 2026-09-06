import { Card } from "@classtown/ui";
import { listTeachers, TEACHERS_PAGE_SIZE } from "@/lib/admin/teachers";
import { PaginationControls } from "../PaginationControls";

export const dynamic = "force-dynamic";

const INPUT_CLASSES =
  "pixel-corners-sm border-2 border-wood-600 bg-cream-400 px-3 py-1.5 text-sm text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600";
const SUBMIT_CLASSES =
  "pixel-corners-sm border-2 border-ink-900 bg-accent-500 px-4 py-1.5 font-[family-name:var(--font-display)] text-sm text-ink-900 hover:bg-accent-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";

interface TeachersPageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function AdminTeachersPage({ searchParams }: TeachersPageProps) {
  const { q, page: pageParam } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
  const { items, total } = await listTeachers({ page, search: q });
  const totalPages = Math.max(1, Math.ceil(total / TEACHERS_PAGE_SIZE));

  return (
    <>
      <div className="flex flex-col gap-1">
        <span className="font-[family-name:var(--font-display)] text-xs tracking-wide text-ink-600">
          ADMIN
        </span>
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-ink-900 sm:text-3xl">
          Teachers
        </h1>
        <p className="text-sm text-ink-600">전체 {total.toLocaleString("ko-KR")}명</p>
      </div>

      <form method="GET" className="flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="이름으로 검색"
          className={INPUT_CLASSES}
        />
        <button type="submit" className={SUBMIT_CLASSES}>
          검색
        </button>
      </form>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b-2 border-wood-600/40 text-xs text-ink-600">
              <th className="px-4 py-3 font-normal">이름</th>
              <th className="px-4 py-3 font-normal">학교</th>
              <th className="px-4 py-3 font-normal">이메일</th>
              <th className="px-4 py-3 font-normal">학급 수</th>
              <th className="px-4 py-3 font-normal">가입일</th>
            </tr>
          </thead>
          <tbody>
            {items.map((teacher) => (
              <tr key={teacher.id} className="border-b-2 border-wood-600/20 last:border-b-0">
                <td className="px-4 py-3 text-ink-900">{teacher.name}</td>
                <td className="px-4 py-3 text-ink-600">{teacher.schoolName}</td>
                <td className="px-4 py-3 text-ink-600">{teacher.email}</td>
                <td className="px-4 py-3 text-ink-600">{teacher.classCount}</td>
                <td className="px-4 py-3 text-ink-600">
                  {new Date(teacher.createdAt).toLocaleDateString("ko-KR")}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink-600">
                  표시할 교사가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <PaginationControls
        page={page}
        totalPages={totalPages}
        basePath="/admin/teachers"
        query={{ q }}
      />
    </>
  );
}
