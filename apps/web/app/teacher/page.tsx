import { redirect } from "next/navigation";
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
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <div className="flex w-full max-w-sm flex-col gap-4">
        <h1 className="text-xl font-bold text-neutral-900">
          {translate(DEFAULT_LOCALE, "auth.teacher.welcomeLabel")}, {teacher.name}
        </h1>
        <dl className="flex flex-col gap-2 text-sm text-neutral-900">
          <div className="flex justify-between gap-4">
            <dt className="font-medium">
              {translate(DEFAULT_LOCALE, "auth.teacher.emailLabel")}
            </dt>
            <dd>{teacher.email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="font-medium">
              {translate(DEFAULT_LOCALE, "auth.teacher.schoolLabel")}
            </dt>
            <dd>{teacher.schoolName}</dd>
          </div>
        </dl>
        <LogoutButton />
      </div>
    </main>
  );
}
