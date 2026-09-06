import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { pageRange, type PagedResult } from "@/lib/admin/pagination";
import type { Enums } from "@classtown/shared-types/database";

export type AnnouncementStatus = Enums<"announcement_status">;

export interface AdminAnnouncementListItem {
  id: string;
  title: string;
  body: string;
  status: AnnouncementStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export const ANNOUNCEMENTS_PAGE_SIZE = 20;

/**
 * Reads through the admin's own session via the "Admins can read all
 * announcements" policy -- draft/scheduled/expired rows are only visible
 * here, never through the public read policy used by SiteStatusBanner.
 */
export async function listAnnouncements(
  page = 1,
): Promise<PagedResult<AdminAnnouncementListItem>> {
  const supabase = await createSupabaseServerClient();
  const { from, to } = pageRange(page, ANNOUNCEMENTS_PAGE_SIZE);

  const { data, count, error } = await supabase
    .from("system_announcements")
    .select(
      "id, title, body, status, scheduled_at, published_at, expires_at, created_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error || !data) {
    return { items: [], total: 0 };
  }

  return {
    items: data.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      status: row.status,
      scheduledAt: row.scheduled_at,
      publishedAt: row.published_at,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    })),
    total: count ?? 0,
  };
}
