import { redirect } from "next/navigation";
import Link from "next/link";
import { Alert, Badge, Card, Header, Panel } from "@classtown/ui";
import { DEFAULT_LOCALE, translate } from "@classtown/i18n";
import { formatEntryCode } from "@classtown/shared-schema";
import { getCurrentTeacher } from "@/lib/auth/getCurrentTeacher";
import {
  getClassSummary,
  listClasses,
  listRecentActivity,
  listRoster,
} from "@/lib/class/queries";
import { LogoutButton } from "./LogoutButton";
import { ClassOverview } from "./ClassOverview";
import { RosterPanel } from "./RosterPanel";
import { RecentActivity } from "./RecentActivity";
import { CreateClassForm } from "./CreateClassForm";

export const dynamic = "force-dynamic";

interface TeacherPageProps {
  searchParams: Promise<{ class?: string }>;
}

export default async function TeacherPage({ searchParams }: TeacherPageProps) {
  const teacher = await getCurrentTeacher();

  if (!teacher) {
    redirect("/login");
  }

  const classes = await listClasses();
  const { class: requestedClassId } = await searchParams;

  // A class id from the query string is only ever used to pick from the list RLS
  // already returned, so an id belonging to another teacher simply isn't found.
  const activeClass =
    classes.find((entry) => entry.id === requestedClassId) ?? classes[0] ?? null;

  const [summary, roster, activity] = activeClass
    ? await Promise.all([
        getClassSummary(activeClass.id),
        listRoster(activeClass.id),
        listRecentActivity(activeClass.id),
      ])
    : [null, [], []];

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

        {classes.length > 1 && (
          <nav className="flex flex-wrap gap-2" aria-label="학급 선택">
            {classes.map((entry) => (
              <Link
                key={entry.id}
                href={`/teacher?class=${entry.id}`}
                className={`pixel-corners-sm border-2 px-3 py-1.5 font-[family-name:var(--font-display)] text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 ${
                  entry.id === activeClass?.id
                    ? "border-ink-900 bg-accent-500 text-ink-900"
                    : "border-wood-600 bg-cream-400 text-ink-600 hover:bg-cream-500"
                }`}
              >
                {entry.name}
              </Link>
            ))}
          </nav>
        )}

        {activeClass && summary ? (
          <>
            <ClassOverview classRecord={activeClass} summary={summary} />
            <RosterPanel roster={roster} />
            <RecentActivity activity={activity} />
          </>
        ) : (
          <Panel variant="wood" className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="font-[family-name:var(--font-display)] text-xl text-ink-900">
                첫 학급을 만들어 보세요
              </h2>
              <p className="text-sm text-ink-600">
                학급을 만들면 참가 코드가 발급됩니다. 학생들이 그 코드로 입장해요.
              </p>
            </div>
            <CreateClassForm />
          </Panel>
        )}

        {activeClass && (
          <Panel variant="paper" className="flex flex-col gap-3">
            <span className="font-[family-name:var(--font-display)] text-xs tracking-wide text-ink-600">
              학생 안내용 참가 코드
            </span>
            <p className="font-[family-name:var(--font-display)] text-3xl tracking-widest text-ink-900">
              {formatEntryCode(activeClass.classCode)}
            </p>
            <p className="text-xs text-ink-600">
              칠판에 적어주세요. 학생은 이 코드와 닉네임만 있으면 입장할 수 있어요.
            </p>
          </Panel>
        )}

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <span className="font-[family-name:var(--font-display)] text-xs tracking-wide text-ink-600">
              내 정보
            </span>
            <Badge tone="wood">
              {translate(DEFAULT_LOCALE, "auth.teacher.roleTeacher")}
            </Badge>
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
            준비 중인 기능
          </span>
          <br />
          레벨·경험치, 구역별 접속 현황, 퀘스트 기록은 순차적으로 추가됩니다.
        </Alert>
      </main>
    </div>
  );
}
