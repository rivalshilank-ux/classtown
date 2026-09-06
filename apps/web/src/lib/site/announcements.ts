import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface PublicAnnouncement {
  id: string;
  title: string;
  body: string;
}

/**
 * Calls get_latest_published_announcement() (20260906060000_public_read_hardening.sql)
 * rather than selecting from system_announcements directly and filtering
 * expiry in application code. An earlier version did exactly that under a
 * row-level "anyone can read published, unexpired" policy -- verified
 * against a real local Supabase instance to leak the full row (including
 * `created_by`, an admin's id) to any client calling PostgREST with the anon
 * key directly and asking for more columns. The expiry filter now lives in
 * the function's SQL too, not in this file.
 */
export async function getLatestPublishedAnnouncement(): Promise<PublicAnnouncement | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc("get_latest_published_announcement");

  const [row] = data ?? [];
  if (error || !row) {
    return null;
  }

  return { id: row.id, title: row.title, body: row.body };
}
