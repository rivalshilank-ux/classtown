import type { ClassPersistence, JoinIdentity } from "./types.js";

export interface RecordedEvent {
  participantId: string;
  classId: string;
  type: "joined" | "left";
}

export interface FakePersistence extends ClassPersistence {
  /** Mints a ticket the way the web server's join action would. */
  issueTicket(identity: JoinIdentity): string;
  readonly events: RecordedEvent[];
  readonly seen: string[][];
  readonly playSeconds: Map<string, number>;
}

/**
 * In-memory stand-in used by the room tests. It enforces the same single-use
 * rule as the database function, so a test that replays a ticket fails here for
 * the same reason it would in production.
 */
export function createFakePersistence(): FakePersistence {
  const tickets = new Map<string, { identity: JoinIdentity; consumed: boolean }>();
  const events: RecordedEvent[] = [];
  const seen: string[][] = [];
  const playSeconds = new Map<string, number>();
  let counter = 0;

  return {
    events,
    seen,
    playSeconds,

    issueTicket(identity) {
      counter += 1;
      const id = `00000000-0000-4000-8000-${String(counter).padStart(12, "0")}`;
      tickets.set(id, { identity, consumed: false });
      return id;
    },

    consumeJoinTicket(ticketId) {
      const ticket = tickets.get(ticketId);
      if (!ticket || ticket.consumed) {
        return Promise.resolve(null);
      }
      ticket.consumed = true;
      return Promise.resolve(ticket.identity);
    },

    markSeen(participantIds) {
      seen.push([...participantIds]);
      return Promise.resolve();
    },

    recordEvent(event) {
      events.push(event);
      return Promise.resolve();
    },

    addPlaySeconds(participantId, seconds) {
      playSeconds.set(participantId, (playSeconds.get(participantId) ?? 0) + seconds);
      return Promise.resolve();
    },
  };
}
