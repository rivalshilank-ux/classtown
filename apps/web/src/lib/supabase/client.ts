import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client factory. Structure only — no auth flow
 * is wired up yet (that starts in Phase 1); this just centralizes env
 * var access so later work doesn't touch this plumbing again.
 */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. See .env.example.",
    );
  }

  return createBrowserClient(url, anonKey);
}
