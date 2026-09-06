import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Header } from "@classtown/ui";
import { getCurrentAdmin } from "@/lib/auth/getCurrentAdmin";
import { AdminLogoutButton } from "./AdminLogoutButton";
import { AdminNav } from "./AdminNav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await getCurrentAdmin();

  // Second, independent check beyond proxy.ts (which only confirmed *some*
  // session exists) -- mirrors the getCurrentTeacher() guard on /teacher, so
  // correctness here never depends solely on the proxy matcher being right.
  if (!admin) {
    redirect("/admin/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-cream-500">
      <Header>
        <AdminLogoutButton adminName={admin.name} />
      </Header>
      <AdminNav />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 py-8">
        {children}
      </main>
    </div>
  );
}
