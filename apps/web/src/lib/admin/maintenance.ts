import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { pageRange, type PagedResult } from "@/lib/admin/pagination";

export interface MaintenanceWindow {
  id: string;
  isActive: boolean;
  message: string;
  reason: string | null;
  startsAt: string;
  endsAt: string | null;
  createdAt: string;
}

export const MAINTENANCE_HISTORY_PAGE_SIZE = 20;

export async function getCurrentMaintenanceWindow(): Promise<MaintenanceWindow | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("maintenance_windows")
    .select("id, is_active, message, reason, starts_at, ends_at, created_at")
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    isActive: data.is_active,
    message: data.message,
    reason: data.reason,
    startsAt: data.starts_at,
    endsAt: data.ends_at,
    createdAt: data.created_at,
  };
}

export async function listMaintenanceHistory(
  page = 1,
): Promise<PagedResult<MaintenanceWindow>> {
  const supabase = await createSupabaseServerClient();
  const { from, to } = pageRange(page, MAINTENANCE_HISTORY_PAGE_SIZE);

  const { data, count, error } = await supabase
    .from("maintenance_windows")
    .select("id, is_active, message, reason, starts_at, ends_at, created_at", {
      count: "exact",
    })
    .order("starts_at", { ascending: false })
    .range(from, to);

  if (error || !data) {
    return { items: [], total: 0 };
  }

  return {
    items: data.map((row) => ({
      id: row.id,
      isActive: row.is_active,
      message: row.message,
      reason: row.reason,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      createdAt: row.created_at,
    })),
    total: count ?? 0,
  };
}
