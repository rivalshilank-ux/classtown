import { Badge, Card } from "@classtown/ui";
import { listAnnouncements, ANNOUNCEMENTS_PAGE_SIZE, type AnnouncementStatus } from "@/lib/admin/announcements";
import { PaginationControls } from "../PaginationControls";
import { CreateAnnouncementForm } from "./CreateAnnouncementForm";
import { AnnouncementRowActions } from "./AnnouncementRowActions";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<AnnouncementStatus, string> = {
  draft: "초안",
  scheduled: "예약됨",
  published: "게시됨",
  expired: "종료됨",
};

const STATUS_TONE: Record<AnnouncementStatus, "good" | "accent" | "bad" | "wood"> = {
  draft: "wood",
  scheduled: "accent",
  published: "good",
  expired: "bad",
};

interface AnnouncementsPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function AdminAnnouncementsPage({ searchParams }: AnnouncementsPageProps) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
  const { items, total } = await listAnnouncements(page);
  const totalPages = Math.max(1, Math.ceil(total / ANNOUNCEMENTS_PAGE_SIZE));

  return (
    <>
      <div className="flex flex-col gap-1">
        <span className="font-[family-name:var(--font-display)] text-xs tracking-wide text-ink-600">
          ADMIN
        </span>
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-ink-900 sm:text-3xl">
          Announcements
        </h1>
        <p className="text-sm text-ink-600">
          &ldquo;예약됨&rdquo; 상태는 자동으로 게시되지 않습니다. 스케줄러(Phase 5)가 구축되기
          전까지는 관리자가 직접 &ldquo;게시&rdquo;를 눌러야 합니다. 전체{" "}
          {total.toLocaleString("ko-KR")}건
        </p>
      </div>

      <CreateAnnouncementForm />

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b-2 border-wood-600/40 text-xs text-ink-600">
              <th className="px-4 py-3 font-normal">제목</th>
              <th className="px-4 py-3 font-normal">상태</th>
              <th className="px-4 py-3 font-normal">게시일</th>
              <th className="px-4 py-3 font-normal">만료일</th>
              <th className="px-4 py-3 font-normal">작업</th>
            </tr>
          </thead>
          <tbody>
            {items.map((announcement) => (
              <tr key={announcement.id} className="border-b-2 border-wood-600/20 last:border-b-0">
                <td className="px-4 py-3">
                  <div className="text-ink-900">{announcement.title}</div>
                  <div className="max-w-md truncate text-xs text-ink-600">{announcement.body}</div>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={STATUS_TONE[announcement.status]}>
                    {STATUS_LABEL[announcement.status]}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-ink-600">
                  {announcement.publishedAt
                    ? new Date(announcement.publishedAt).toLocaleString("ko-KR")
                    : "-"}
                </td>
                <td className="px-4 py-3 text-ink-600">
                  {announcement.expiresAt
                    ? new Date(announcement.expiresAt).toLocaleString("ko-KR")
                    : "-"}
                </td>
                <td className="px-4 py-3">
                  <AnnouncementRowActions id={announcement.id} status={announcement.status} />
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink-600">
                  작성된 공지가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <PaginationControls page={page} totalPages={totalPages} basePath="/admin/announcements" />
    </>
  );
}
