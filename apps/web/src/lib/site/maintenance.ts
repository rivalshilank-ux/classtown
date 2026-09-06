import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface ActiveMaintenanceNotice {
  message: string;
  startsAt: string;
}

/**
 * Calls get_active_maintenance_notice() (20260906060000_public_read_hardening.sql)
 * rather than selecting from maintenance_windows directly. An earlier version
 * of this function selected specific columns from the table under a
 * row-level "anyone can read the active row" policy -- verified against a
 * real local Supabase instance to leak the full row (including `reason` and
 * `created_by`, an admin's id) to any client calling PostgREST with the anon
 * key directly, regardless of which columns this function asked for. RLS is
 * row-level, not column-level; a security definer function is the actual
 * boundary here, the same pattern already used for join_class.
 */
export async function getActiveMaintenanceNotice(): Promise<ActiveMaintenanceNotice | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc("get_active_maintenance_notice");

  const [row] = data ?? [];
  if (error || !row) {
    return null;
  }

  return { message: row.message, startsAt: row.starts_at };
}
