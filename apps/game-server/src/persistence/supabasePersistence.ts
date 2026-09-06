import { createClient } from "@supabase/supabase-js";
import type { Database } from "@classtown/shared-types/database";
import type { ClassPersistence, JoinIdentity } from "./types.js";

/**
 * The game server is the only writer for student rows, so it holds the service
 * role and therefore bypasses RLS. Every method below either derives its
 * identity from a consumed ticket or is called with an id the room already
 * resolved that way — none of them accept an identifier from a client payload.
 */
export function createSupabasePersistence(): ClassPersistence {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "game-server requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. See .env.example.",
    );
  }

  const client = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return {
    async consumeJoinTicket(ticketId: string): Promise<JoinIdentity | null> {
      const { data, error } = await client.rpc("consume_join_ticket", {
        p_ticket_id: ticketId,
      });

      if (error) {
        console.error("consume_join_ticket failed:", error.message);
        return null;
      }

      const row = data?.[0];
      if (!row) {
        return null;
      }

      return {
        participantId: row.participant_id,
        classId: row.class_id,
        nickname: row.nickname,
      };
    },

    async markSeen(participantIds: readonly string[]): Promise<void> {
      if (participantIds.length === 0) {
        return;
      }

      // One statement for the whole room rather than one per player.
      const { error } = await client
        .from("student_participants")
        .update({ last_seen_at: new Date().toISOString() })
        .in("id", [...participantIds]);

      if (error) {
        console.error("markSeen failed:", error.message);
      }
    },

    async recordEvent(event): Promise<void> {
      const { error } = await client.from("student_activity_events").insert({
        participant_id: event.participantId,
        class_id: event.classId,
        event_type: event.type,
      });

      if (error) {
        console.error("recordEvent failed:", error.message);
      }
    },

    async isMaintenanceActive(): Promise<boolean> {
      // get_active_maintenance_notice() is a security definer function
      // granted to anon/authenticated/service_role alike (see
      // 20260906060000_public_read_hardening.sql) -- checking "is
      // maintenance on" needs no special privilege, so this reuses the same
      // public RPC apps/web's SiteStatusBanner calls rather than reading
      // maintenance_windows directly.
      const { data, error } = await client.rpc("get_active_maintenance_notice");

      if (error) {
        // Fails open: a transient error here shouldn't block every join by
        // itself. A genuinely unreachable database also fails
        // consumeJoinTicket right after this, which rejects the join anyway.
        console.error("get_active_maintenance_notice failed:", error.message);
        return false;
      }

      return (data?.length ?? 0) > 0;
    },

    async addPlaySeconds(participantId: string, seconds: number): Promise<void> {
      if (seconds <= 0) {
        return;
      }

      const { data, error: readError } = await client
        .from("student_progression")
        .select("play_seconds")
        .eq("participant_id", participantId)
        .single();

      if (readError || !data) {
        return;
      }

      const { error } = await client
        .from("student_progression")
        .update({ play_seconds: data.play_seconds + seconds })
        .eq("participant_id", participantId);

      if (error) {
        console.error("addPlaySeconds failed:", error.message);
      }
    },
  };
}
