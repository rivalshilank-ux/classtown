import "server-only";
import type { AdminAccount } from "@classtown/shared-types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@classtown/shared-types/database";

type AdminAccountRow = Tables<"admin_accounts">;

function mapRow(row: AdminAccountRow): AdminAccount {
  return {
    id: row.id,
    role: "admin",
    name: row.name,
    email: row.email,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getCurrentAdmin(): Promise<AdminAccount | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile, error } = await supabase
    .from("admin_accounts")
    .select("id, name, email, is_active, created_at, updated_at")
    .eq("id", user.id)
    .single();

  if (error || !profile || !profile.is_active) {
    return null;
  }

  return mapRow(profile);
}
