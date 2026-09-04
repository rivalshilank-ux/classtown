import { redirect } from "next/navigation";
import { Alert, Card, Header } from "@classtown/ui";
import { DEFAULT_LOCALE, translate } from "@classtown/i18n";
import { getCurrentTeacher } from "@/lib/auth/getCurrentTeacher";
import { LogoutButton } from "./LogoutButton";

// Every response here is scoped to whichever teacher is logged in — it
// must never be statically generated/cached and served to someone else.
export const dynamic = "force-dynamic";

/**
 * proxy.ts already redirects unauthenticated requests away from here,
 * but that's routing, not proof — this checks auth again from the page
 * itself so access doesn't depend on the proxy matcher never being
 * misconfigured.
 */
export default async function TeacherPage() {
  const teacher = await getCurrentTeacher();

  if (!teacher) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header>
        <LogoutButton />
      </Header>

      <main className="flex flex-1 flex-col items-center gap-6 p-4 py-8">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">
            {translate(DEFAULT_LOCALE, "auth.teacher.welcomeLabel")}, {teacher.name}
          </h1>
        </div>

        <Card className="max-w-sm">
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-neutral-500">
                {translate(DEFAULT_LOCALE, "auth.teacher.emailLabel")}
              </dt>
              <dd className="font-medium text-neutral-900">{teacher.email}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-neutral-500">
                {translate(DEFAULT_LOCALE, "auth.teacher.schoolLabel")}
              </dt>
              <dd className="font-medium text-neutral-900">{teacher.schoolName}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-neutral-500">
                {translate(DEFAULT_LOCALE, "auth.teacher.roleLabel")}
              </dt>
              <dd className="font-medium text-neutral-900">
                {translate(DEFAULT_LOCALE, "auth.teacher.roleTeacher")}
              </dd>
            </div>
          </dl>
        </Card>

        <div className="w-full max-w-sm">
          <Alert variant="info">
            <span className="font-medium">
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
