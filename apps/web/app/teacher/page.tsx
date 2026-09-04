import { redirect } from "next/navigation";
import { Alert, Badge, Card, Header } from "@classtown/ui";
import { DEFAULT_LOCALE, translate } from "@classtown/i18n";
import { getCurrentTeacher } from "@/lib/auth/getCurrentTeacher";
import { LogoutButton } from "./LogoutButton";

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

      <main className="flex flex-1 flex-col items-center gap-6 p-4 py-8">
        <div className="flex w-full max-w-sm flex-col items-start gap-2">
          <Badge tone="wood">{translate(DEFAULT_LOCALE, "auth.teacher.roleTeacher")}</Badge>
          <h1 className="font-[family-name:var(--font-display)] text-2xl text-ink-900 sm:text-3xl">
            {translate(DEFAULT_LOCALE, "auth.teacher.welcomeLabel")}, {teacher.name}
          </h1>
        </div>

        <Card className="max-w-sm">
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between gap-4 border-b-2 border-wood-600/40 pb-3">
              <dt className="text-ink-600">
                {translate(DEFAULT_LOCALE, "auth.teacher.emailLabel")}
              </dt>
              <dd className="font-medium text-ink-900">{teacher.email}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-b-2 border-wood-600/40 pb-3">
              <dt className="text-ink-600">
                {translate(DEFAULT_LOCALE, "auth.teacher.schoolLabel")}
              </dt>
              <dd className="font-medium text-ink-900">{teacher.schoolName}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-ink-600">
                {translate(DEFAULT_LOCALE, "auth.teacher.roleLabel")}
              </dt>
              <dd className="font-medium text-ink-900">
                {translate(DEFAULT_LOCALE, "auth.teacher.roleTeacher")}
              </dd>
            </div>
          </dl>
        </Card>

        <div className="w-full max-w-sm">
          <Alert variant="info">
            <span className="font-[family-name:var(--font-display)] text-base">
              {translate(DEFAULT_LOCALE, "auth.teacher.comingSoonTitle")}
            </span>
            <br />
            {translate(DEFAULT_LOCALE, "auth.teacher.comingSoonBody")}
          </Alert>
        </div>
      </main>
    </div>
  );
}
