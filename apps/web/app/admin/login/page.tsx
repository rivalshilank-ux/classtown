import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth/getCurrentAdmin";
import { AdminLoginForm } from "./AdminLoginForm";

// Not inherited from a layout any more: login/ is a sibling of the
// (protected) route group precisely so it isn't wrapped by that group's
// admin-only layout (see docs/adr/0004-maintenance-gate.md's Consequences
// section for the redirect loop that caused). It still calls
// getCurrentAdmin() itself, so it needs its own dynamic export, the same as
// /teacher's.
export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const admin = await getCurrentAdmin();

  if (admin) {
    redirect("/admin");
  }

  return <AdminLoginForm />;
}
