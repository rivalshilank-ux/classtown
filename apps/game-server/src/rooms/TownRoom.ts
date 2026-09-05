import { Client, Room, ServerError } from "@colyseus/core";
import {
  isSolidAtPixel,
  joinTicketOptionsSchema,
  moveIntentSchema,
  PLAYER_RADIUS,
  PlayerState,
  SPAWN_POINT,
  TownRoomState,
  type MoveIntentInput,
} from "@classtown/shared-schema";
import type { ClassPersistence, JoinIdentity } from "../persistence/types.js";

const MOVE_SPEED = 160;
const SIMULATION_INTERVAL_MS = 1000 / 20;
const HEARTBEAT_INTERVAL_MS = 60_000;

/**
 * A session shorter than this emits no joined/left events, so a student
 * refreshing repeatedly cannot flood the teacher's activity feed.
 */
const MIN_LOGGED_SESSION_MS = 5_000;

// Slightly smaller than the visual radius so movement doesn't visibly
// stop short of a wall's edge.
const COLLISION_RADIUS = PLAYER_RADIUS - 2;

function canOccupy(x: number, y: number): boolean {
  return (
    !isSolidAtPixel(x - COLLISION_RADIUS, y - COLLISION_RADIUS) &&
    !isSolidAtPixel(x + COLLISION_RADIUS, y - COLLISION_RADIUS) &&
    !isSolidAtPixel(x - COLLISION_RADIUS, y + COLLISION_RADIUS) &&
    !isSolidAtPixel(x + COLLISION_RADIUS, y + COLLISION_RADIUS)
  );
}

export interface TownRoomOptions {
  persistence: ClassPersistence;
}

interface SessionRecord {
  identity: JoinIdentity;
  joinedAt: number;
}

export class TownRoom extends Room<TownRoomState> {
  maxClients = 40;

  private moveIntents = new Map<string, MoveIntentInput>();

  /**
   * Participant identity is kept here rather than on PlayerState, because
   * PlayerState is broadcast to every client in the room and a participant id
   * is not something one student should learn about another.
   */
  private sessions = new Map<string, SessionRecord>();

  private persistence!: ClassPersistence;

  onCreate(options: TownRoomOptions) {
    this.persistence = options.persistence;

    this.setState(new TownRoomState());
    this.setSimulationInterval(
      (deltaTimeMs) => this.movePlayers(deltaTimeMs),
      SIMULATION_INTERVAL_MS,
    );

    this.clock.setInterval(() => {
      void this.heartbeat();
    }, HEARTBEAT_INTERVAL_MS);

    this.onMessage("move", (client, message: unknown) => {
      const parsed = moveIntentSchema.safeParse(message);
      if (!parsed.success) {
        return;
      }
      this.moveIntents.set(client.sessionId, parsed.data);
    });
  }

  /**
   * The client sends a ticket and nothing else. Class and participant come back
   * from consuming that ticket, so there is no client-supplied identity here for
   * the room to trust — which is the whole point of the ticket existing.
   */
  async onAuth(_client: Client, options: unknown): Promise<JoinIdentity> {
    const parsed = joinTicketOptionsSchema.safeParse(options);
    if (!parsed.success) {
      throw new ServerError(400, "Invalid join options");
    }

    const identity = await this.persistence.consumeJoinTicket(parsed.data.ticket);
    if (!identity) {
      throw new ServerError(401, "Invalid or expired join ticket");
    }

    return identity;
  }

  onJoin(client: Client, _options: unknown, auth: JoinIdentity) {
    // A reconnect after a dropped connection arrives as a second session for the
    // same participant. Dropping the older one is the behaviour a player expects.
    for (const [sessionId, record] of this.sessions) {
      if (
        record.identity.participantId === auth.participantId &&
        sessionId !== client.sessionId
      ) {
        this.clients.find((c) => c.sessionId === sessionId)?.leave(4000);
      }
    }

    const player = new PlayerState();
    player.sessionId = client.sessionId;
    player.nickname = auth.nickname;
    player.x = SPAWN_POINT.x;
    player.y = SPAWN_POINT.y;
    this.state.players.set(client.sessionId, player);
    this.moveIntents.set(client.sessionId, { dx: 0, dy: 0 });
    this.sessions.set(client.sessionId, { identity: auth, joinedAt: Date.now() });

    void this.persistence.markSeen([auth.participantId]);
    void this.persistence.recordEvent({
      participantId: auth.participantId,
      classId: auth.classId,
      type: "joined",
    });
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
    this.moveIntents.delete(client.sessionId);

    const record = this.sessions.get(client.sessionId);
    this.sessions.delete(client.sessionId);
    if (!record) {
      return;
    }

    const elapsedMs = Date.now() - record.joinedAt;
    const { participantId, classId } = record.identity;

    void this.persistence.markSeen([participantId]);
    void this.persistence.addPlaySeconds(
      participantId,
      Math.floor(elapsedMs / 1000),
    );

    if (elapsedMs >= MIN_LOGGED_SESSION_MS) {
      void this.persistence.recordEvent({ participantId, classId, type: "left" });
    }
  }

  /** One batched write for the whole room, never one per player per packet. */
  private async heartbeat() {
    const participantIds = [...this.sessions.values()].map(
      (record) => record.identity.participantId,
    );
    if (participantIds.length === 0) {
      return;
    }
    await this.persistence.markSeen(participantIds);
  }

  private movePlayers(deltaTimeMs: number) {
    const deltaSeconds = deltaTimeMs / 1000;

    for (const [sessionId, intent] of this.moveIntents) {
      const player = this.state.players.get(sessionId);
      if (!player) {
        continue;
      }

      const magnitude = Math.hypot(intent.dx, intent.dy);
      if (magnitude === 0) {
        continue;
      }

      const scale = (MOVE_SPEED * deltaSeconds) / Math.max(magnitude, 1);

      // Resolve each axis separately so the player slides along a wall
      // instead of getting fully stopped by a diagonal collision.
      const nextX = player.x + intent.dx * scale;
      if (canOccupy(nextX, player.y)) {
        player.x = nextX;
      }

      const nextY = player.y + intent.dy * scale;
      if (canOccupy(player.x, nextY)) {
        player.y = nextY;
      }
    }
  }
}
