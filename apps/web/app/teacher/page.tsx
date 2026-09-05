import { redirect } from "next/navigation";
import { Alert, Badge, Card, Header } from "@classtown/ui";
import { DEFAULT_LOCALE, translate } from "@classtown/i18n";
import { getCurrentTeacher } from "@/lib/auth/getCurrentTeacher";
import { LogoutButton } from "./LogoutButton";
import { ClassOverview } from "./ClassOverview";
import { WorldStatus } from "./WorldStatus";
import { RecentActivity } from "./RecentActivity";

export const dynamic = "force-dynamic";

export default async function TeacherPage() {
  const teacher = await getCurrentTeacher();

  if (!teacher) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-cream-500">
      <Header>
        <LogoutButton />
      </Header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 py-8">
        <div className="flex flex-col gap-1">
          <span className="font-[family-name:var(--font-display)] text-xs tracking-wide text-ink-600">
            CLASSTOWN TEACHER
          </span>
          <h1 className="font-[family-name:var(--font-display)] text-2xl text-ink-900 sm:text-3xl">
            {teacher.name} 선생님, 오늘도 좋은 하루 보내세요.
          </h1>
        </div>

        <ClassOverview />
        <WorldStatus />
        <RecentActivity />

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <span className="font-[family-name:var(--font-display)] text-xs tracking-wide text-ink-600">
              내 정보
            </span>
            <Badge tone="wood">{translate(DEFAULT_LOCALE, "auth.teacher.roleTeacher")}</Badge>
          </div>
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between gap-4 border-b-2 border-wood-600/40 pb-3">
              <dt className="text-ink-600">
                {translate(DEFAULT_LOCALE, "auth.teacher.emailLabel")}
              </dt>
              <dd className="font-medium text-ink-900">{teacher.email}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-ink-600">
                {translate(DEFAULT_LOCALE, "auth.teacher.schoolLabel")}
              </dt>
              <dd className="font-medium text-ink-900">{teacher.schoolName}</dd>
            </div>
          </dl>
        </Card>

        <Alert variant="info">
          <span className="font-[family-name:var(--font-display)] text-base">
            {translate(DEFAULT_LOCALE, "auth.teacher.comingSoonTitle")}
          </span>
          <br />
          {translate(DEFAULT_LOCALE, "auth.teacher.comingSoonBody")}
        </Alert>
      </main>
    </div>
  );
}
