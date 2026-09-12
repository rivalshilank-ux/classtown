import { Client, Room, ServerError } from "@colyseus/core";
import {
  chatMessageSchema,
  INTERACTION_POINTS,
  INTERACTION_RANGE_PX,
  interactionPointById,
  interactionPointCenter,
  interactMessageSchema,
  isSolidAtPixel,
  joinTicketOptionsSchema,
  moveIntentSchema,
  PLAYER_RADIUS,
  PlayerState,
  SPAWN_POINT,
  TownRoomState,
  type AnnouncementEvent,
  type ChatBroadcastEvent,
  type ChatRejection,
  type DiscoveryProgress,
  type FacingDirection,
  type InteractResult,
  type MoveIntentInput,
  type PlayerDiscoveryEvent,
  type TourCompletedEvent,
} from "@classtown/shared-schema";
import { MAINTENANCE_MODE_ERROR_CODE } from "@classtown/shared-types";
import type { ClassPersistence, JoinIdentity } from "../persistence/types.js";

const MOVE_SPEED = 160;
const SIMULATION_INTERVAL_MS = 1000 / 20;
const HEARTBEAT_INTERVAL_MS = 60_000;

/**
 * Frequent enough that a teacher's announcement feels close to live without
 * turning it into a second chat channel's polling load; the room only ever
 * queries for classIds it currently has a connected session for.
 */
const ANNOUNCEMENT_POLL_INTERVAL_MS = 4_000;

/**
 * A session shorter than this emits no joined/left events, so a student
 * refreshing repeatedly cannot flood the teacher's activity feed.
 */
const MIN_LOGGED_SESSION_MS = 5_000;

/**
 * How long an unconsented drop (WiFi blip, laptop lid closing) holds the
 * seat open before treating it as a real departure. Long enough for a
 * genuinely transient network hiccup on school WiFi, short enough that a
 * closed laptop does not read as "online" for the rest of the period.
 */
const RECONNECTION_GRACE_SECONDS = 20;

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

// Scatters simultaneous joiners around the plaza instead of stacking every
// new player on the exact same pixel, while keeping everyone in the same
// gathering spot so friends who join together still land next to each other.
const SPAWN_JITTER_RADIUS_PX = 48;
const SPAWN_JITTER_ATTEMPTS = 8;

function pickSpawnPosition(): { x: number; y: number } {
  for (let attempt = 0; attempt < SPAWN_JITTER_ATTEMPTS; attempt++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * SPAWN_JITTER_RADIUS_PX;
    const x = SPAWN_POINT.x + Math.cos(angle) * radius;
    const y = SPAWN_POINT.y + Math.sin(angle) * radius;
    if (canOccupy(x, y)) {
      return { x, y };
    }
  }
  // Every jittered attempt landed on something solid (very unlikely inside
  // the open plaza) -- the exact spawn point is always walkable.
  return { x: SPAWN_POINT.x, y: SPAWN_POINT.y };
}

/** Dominant axis of the intent wins; ties resolve to vertical. */
function directionFromIntent(intent: MoveIntentInput): FacingDirection {
  if (Math.abs(intent.dx) > Math.abs(intent.dy)) {
    return intent.dx > 0 ? "right" : "left";
  }
  return intent.dy > 0 ? "down" : "up";
}

const TOTAL_INTERACTION_POINTS = INTERACTION_POINTS.length;

/** Guards against a client spamming "interact" faster than a person could plausibly re-press a key. */
const INTERACT_COOLDOWN_MS = 400;

/** Chat rate limit: a real student typing can't exceed this; a script flooding the room can't get past it. */
const CHAT_RATE_LIMIT_MAX = 5;
const CHAT_RATE_LIMIT_WINDOW_MS = 8_000;

export interface TownRoomOptions {
  persistence: ClassPersistence;
  /** Overridable only for tests -- production always uses the real default. */
  reconnectionGraceSeconds?: number;
  /** Overridable only for tests -- lets a full-campus-tour test cross the
   * map in real time instead of ~160px/s. Production always uses MOVE_SPEED. */
  moveSpeed?: number;
  /** Overridable only for tests -- production always uses the real default. */
  announcementPollIntervalMs?: number;
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

  /**
   * Campus discovery tour progress, keyed by participantId (not sessionId)
   * so it survives a reconnect -- see onJoin's discovery_progress send.
   * Kept in room memory only; a completed tour is the one thing durably
   * recorded, via persistence.recordEvent. Bounded by class roster size for
   * the room's lifetime, never cleared on leave.
   */
  private discoveries = new Map<string, Set<string>>();

  /** Per-session interact spam guard -- sessionId, not participantId, so a reconnect gets a clean cooldown. */
  private lastInteractAt = new Map<string, number>();

  /** Per-session chat send timestamps within the current rate-limit window -- sessionId, not participantId, so a reconnect gets a clean slate. */
  private chatTimestamps = new Map<string, number[]>();

  private persistence!: ClassPersistence;
  private reconnectionGraceSeconds = RECONNECTION_GRACE_SECONDS;
  private moveSpeed = MOVE_SPEED;

  onCreate(options: TownRoomOptions) {
    this.persistence = options.persistence;
    this.reconnectionGraceSeconds =
      options.reconnectionGraceSeconds ?? RECONNECTION_GRACE_SECONDS;
    this.moveSpeed = options.moveSpeed ?? MOVE_SPEED;

    this.setState(new TownRoomState());
    this.setSimulationInterval(
      (deltaTimeMs) => this.movePlayers(deltaTimeMs),
      SIMULATION_INTERVAL_MS,
    );

    this.clock.setInterval(() => {
      void this.heartbeat();
    }, HEARTBEAT_INTERVAL_MS);

    this.clock.setInterval(() => {
      void this.deliverAnnouncements();
    }, options.announcementPollIntervalMs ?? ANNOUNCEMENT_POLL_INTERVAL_MS);

    this.onMessage("move", (client, message: unknown) => {
      const parsed = moveIntentSchema.safeParse(message);
      if (!parsed.success) {
        return;
      }
      this.moveIntents.set(client.sessionId, parsed.data);
    });

    this.onMessage("interact", (client, message: unknown) => {
      const parsed = interactMessageSchema.safeParse(message);
      if (!parsed.success) {
        return;
      }
      this.handleInteract(client, parsed.data.pointId);
    });

    // Client-requested rather than pushed from onJoin: a message sent before
    // the client has registered its onMessage handler for it is dropped, not
    // buffered (colyseus.js has no queue for this), and onJoin's send would
    // race exactly that handler's registration in TownScene.create(). The
    // client asks once its listeners are definitely attached instead.
    this.onMessage("request_progress", (client) => {
      this.sendDiscoveryProgress(client);
    });

    this.onMessage("chat", (client, message: unknown) => {
      this.handleChat(client, message);
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

    // Rejects a *new* join only. A player already in the room during this
    // check is untouched -- onAuth runs once, at join time, never again for
    // an existing session, so there is nothing here that could disconnect
    // one mid-game.
    if (await this.persistence.isMaintenanceActive()) {
      throw new ServerError(503, MAINTENANCE_MODE_ERROR_CODE);
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

    const spawn = pickSpawnPosition();
    const player = new PlayerState();
    player.sessionId = client.sessionId;
    player.nickname = auth.nickname;
    player.x = spawn.x;
    player.y = spawn.y;
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

  /** Restores a returning or reconnecting player's discovery UI from
   * room-held progress -- discoveries survive by participantId even across
   * a fresh sessionId. See the "request_progress" handler in onCreate for
   * why this is pulled by the client rather than pushed from onJoin. */
  private sendDiscoveryProgress(client: Client) {
    const session = this.sessions.get(client.sessionId);
    if (!session) {
      return;
    }
    const discovered = this.discoveries.get(session.identity.participantId);
    const progress: DiscoveryProgress = {
      discoveredIds: discovered ? [...discovered] : [],
      totalCount: TOTAL_INTERACTION_POINTS,
    };
    client.send("discovery_progress", progress);
  }

  /**
   * `consented` is true for a deliberate leave (the client SDK called
   * `.leave()` -- including the multi-device kick above, which does exactly
   * that) and false for a dropped connection: a WiFi blip, a laptop lid
   * closing, a tab crashing. Only the latter gets a reconnection window --
   * a deliberate leave still cleans up immediately, exactly as before this
   * existed.
   *
   * The move intent is always cleared up front regardless of outcome: the
   * per-tick simulation loop keys off this map alone, so a frozen player
   * with a stale non-zero intent would otherwise keep sliding across the
   * map with nobody driving.
   */
  async onLeave(client: Client, consented: boolean) {
    this.moveIntents.delete(client.sessionId);
    this.lastInteractAt.delete(client.sessionId);
    this.chatTimestamps.delete(client.sessionId);

    const record = this.sessions.get(client.sessionId);
    if (!record) {
      return;
    }

    if (!consented) {
      try {
        await this.allowReconnection(client, this.reconnectionGraceSeconds);
        // Reconnected within the window: same session, same participant,
        // same position -- no new ticket, no join/left event pair, no
        // persistence write. Only the movement intent needed resetting.
        this.moveIntents.set(client.sessionId, { dx: 0, dy: 0 });
        return;
      } catch {
        // Grace period expired with no reconnection -- fall through to the
        // same cleanup a deliberate leave gets.
      }
    }

    this.state.players.delete(client.sessionId);
    this.sessions.delete(client.sessionId);

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

  /**
   * Delivers a teacher's announcement to only the sessions belonging to its
   * class -- this room is shared across every class (see docs/teacher/
   * teacher.md's "Room-per-class isolation" Planned note), so this is the one
   * place a broadcast is filtered by classId instead of going to everyone the
   * way chat does.
   */
  private async deliverAnnouncements() {
    const classIds = new Set<string>();
    for (const record of this.sessions.values()) {
      classIds.add(record.identity.classId);
    }
    if (classIds.size === 0) {
      return;
    }

    const pending = await this.persistence.pollPendingAnnouncements([...classIds]);
    if (pending.length === 0) {
      return;
    }

    for (const announcement of pending) {
      const event: AnnouncementEvent = {
        id: announcement.id,
        message: announcement.message,
        sentAt: Date.now(),
      };
      for (const [sessionId, record] of this.sessions) {
        if (record.identity.classId !== announcement.classId) {
          continue;
        }
        this.clients.find((c) => c.sessionId === sessionId)?.send("announcement", event);
      }
    }

    await this.persistence.markAnnouncementsDelivered(pending.map((row) => row.id));
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

      player.direction = directionFromIntent(intent);

      const scale = (this.moveSpeed * deltaSeconds) / Math.max(magnitude, 1);

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

  /**
   * The campus discovery tour: walk up to one of the map's fixed
   * INTERACTION_POINTS and interact with it. Every rule that matters --
   * which points exist, whether the player is close enough, whether it was
   * already found -- is decided here, never by the client. See
   * docs/game/interaction.md.
   */
  private handleInteract(client: Client, pointId: string) {
    const player = this.state.players.get(client.sessionId);
    const session = this.sessions.get(client.sessionId);
    if (!player || !session) {
      return;
    }

    const now = Date.now();
    if (now - (this.lastInteractAt.get(client.sessionId) ?? 0) < INTERACT_COOLDOWN_MS) {
      return;
    }

    const point = interactionPointById(pointId);
    if (!point) {
      client.send("interact_result", {
        ok: false,
        pointId,
        reason: "unknown_point",
      } satisfies InteractResult);
      return;
    }

    const center = interactionPointCenter(point);
    const distance = Math.hypot(player.x - center.x, player.y - center.y);
    if (distance > INTERACTION_RANGE_PX) {
      client.send("interact_result", {
        ok: false,
        pointId,
        reason: "out_of_range",
      } satisfies InteractResult);
      return;
    }

    this.lastInteractAt.set(client.sessionId, now);

    const { participantId, classId } = session.identity;
    let discovered = this.discoveries.get(participantId);
    if (!discovered) {
      discovered = new Set<string>();
      this.discoveries.set(participantId, discovered);
    }

    const alreadyDiscovered = discovered.has(point.id);
    if (!alreadyDiscovered) {
      discovered.add(point.id);
    }

    const result: InteractResult = {
      ok: true,
      pointId: point.id,
      label: point.label,
      alreadyDiscovered,
      discoveredIds: [...discovered],
      totalCount: TOTAL_INTERACTION_POINTS,
    };
    client.send("interact_result", result);

    if (alreadyDiscovered) {
      return;
    }

    const discoveryEvent: PlayerDiscoveryEvent = {
      sessionId: client.sessionId,
      nickname: player.nickname,
      label: point.label,
    };
    this.broadcast("player_discovery", discoveryEvent);

    if (discovered.size === TOTAL_INTERACTION_POINTS) {
      const completedEvent: TourCompletedEvent = {
        sessionId: client.sessionId,
        nickname: player.nickname,
      };
      this.broadcast("tour_completed", completedEvent);

      void this.persistence.recordEvent({
        participantId,
        classId,
        type: "activity_completed",
        payload: { activity: "campus_tour" },
      });
    }
  }

  /**
   * Chat is plain text, broadcast verbatim: nothing here is ever rendered as
   * HTML by a client, so there is no markup to strip. Everything that could
   * be forged -- sender identity, timestamp -- is filled in from server-held
   * state, never taken from the message itself. See docs on the shared
   * chatMessageSchema for the length/emptiness rules enforced before this
   * runs at all.
   */
  private handleChat(client: Client, message: unknown) {
    const player = this.state.players.get(client.sessionId);
    if (!player) {
      return;
    }

    const parsed = chatMessageSchema.safeParse(message);
    if (!parsed.success) {
      client.send("chat_rejected", { reason: "invalid" } satisfies ChatRejection);
      return;
    }

    if (this.isChatRateLimited(client.sessionId)) {
      client.send("chat_rejected", { reason: "rate_limited" } satisfies ChatRejection);
      return;
    }

    const event: ChatBroadcastEvent = {
      sessionId: client.sessionId,
      nickname: player.nickname,
      text: parsed.data.text,
      sentAt: Date.now(),
    };
    this.broadcast("chat", event);
  }

  /** Sliding window: at most CHAT_RATE_LIMIT_MAX sends per CHAT_RATE_LIMIT_WINDOW_MS, per session. */
  private isChatRateLimited(sessionId: string): boolean {
    const now = Date.now();
    const windowStart = now - CHAT_RATE_LIMIT_WINDOW_MS;
    const recent = (this.chatTimestamps.get(sessionId) ?? []).filter(
      (timestamp) => timestamp > windowStart,
    );

    if (recent.length >= CHAT_RATE_LIMIT_MAX) {
      this.chatTimestamps.set(sessionId, recent);
      return true;
    }

    recent.push(now);
    this.chatTimestamps.set(sessionId, recent);
    return false;
  }
}
