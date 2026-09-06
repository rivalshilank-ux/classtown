import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ServiceStatus = "healthy" | "degraded" | "down" | "unknown";

export interface SystemHealthSnapshot {
  web: ServiceStatus;
  auth: ServiceStatus;
  database: ServiceStatus;
  gameServer: ServiceStatus;
}

function toHealthCheckUrl(rawUrl: string | undefined): string | null {
  if (!rawUrl) {
    return null;
  }

  try {
    const url = new URL(rawUrl);
    url.protocol = url.protocol === "wss:" ? "https:" : "http:";
    url.pathname = url.pathname.replace(/\/+$/, "") + "/health";
    return url.toString();
  } catch {
    return null;
  }
}

async function checkGameServer(): Promise<ServiceStatus> {
  const healthUrl = toHealthCheckUrl(process.env.NEXT_PUBLIC_GAME_SERVER_URL);
  if (!healthUrl) {
    return "unknown";
  }

  try {
    const response = await fetch(healthUrl, {
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    return response.ok ? "healthy" : "degraded";
  } catch {
    return "down";
  }
}

/**
 * A dedicated, real probe for pages (like /admin/system) that don't already
 * run a query of their own to derive database health from -- Overview keeps
 * using its own getOverviewStats() result via the databaseOk parameter below
 * instead of calling this, so it isn't running the same check twice.
 */
export async function checkDatabaseReachable(): Promise<boolean> {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("admin_accounts").select("id").limit(1);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Web and Auth are reported "healthy" unconditionally rather than probed:
 * reaching this function at all means the admin layout's getCurrentAdmin()
 * already completed a real auth.getUser() round trip for this same request.
 * Database is supplied by the caller, which already ran a real query --
 * nothing here is fabricated, but nothing is re-checked redundantly either.
 */
export async function getSystemHealthSnapshot(
  databaseOk: boolean,
): Promise<SystemHealthSnapshot> {
  const gameServer = await checkGameServer();

  return {
    web: "healthy",
    auth: "healthy",
    database: databaseOk ? "healthy" : "down",
    gameServer,
  };
}
