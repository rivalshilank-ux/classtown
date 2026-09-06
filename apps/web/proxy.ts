import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PROTECTED_PREFIXES = ["/teacher"];
const AUTH_PAGES = ["/login", "/signup"];

// /admin is protected separately from /teacher: unauthenticated visitors go to
// /admin/login, not /login, and /admin/login itself must stay reachable or an
// unauthenticated visitor would be redirected back into the page they're
// already on. This check only asks "is there a session at all" -- whether
// that session actually belongs to an admin is verified independently by
// getCurrentAdmin() in app/admin/layout.tsx, the same doubled-guard pattern
// /teacher already uses.
const ADMIN_PROTECTED_PREFIX = "/admin";
const ADMIN_PUBLIC_PATHS = ["/admin/login"];

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );
  const isAdminProtected =
    pathname.startsWith(ADMIN_PROTECTED_PREFIX) &&
    !ADMIN_PUBLIC_PATHS.includes(pathname);
  const isAuthPage = AUTH_PAGES.includes(pathname);

  if (isProtected && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAdminProtected && !user) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  if (isAuthPage && user) {
    return NextResponse.redirect(new URL("/teacher", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
