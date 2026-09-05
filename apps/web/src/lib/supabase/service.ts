import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@classtown/shared-types/database";

/**
 * The service role bypasses RLS entirely, so every call made with this client is
 * the security boundary. Never hand it a class or participant identifier that
 * arrived from a browser without first re-deriving it from `auth.uid()` or from
 * a consumed join ticket.
 */
export function createSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. See .env.example.",
    );
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
