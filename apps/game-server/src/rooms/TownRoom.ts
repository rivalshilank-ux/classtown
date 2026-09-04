import { Client, Room, ServerError } from "@colyseus/core";
import {
  joinRoomOptionsSchema,
  moveIntentSchema,
  PlayerState,
  TownRoomState,
  type JoinRoomOptionsInput,
  type MoveIntentInput,
} from "@classtown/shared-schema";

/** World units per second. Server-owned — never trust a client-supplied speed. */
const MOVE_SPEED = 4;

/** Authoritative simulation tick, independent of each client's own frame rate. */
const SIMULATION_INTERVAL_MS = 1000 / 20;

/**
 * Minimal authoritative room. It exists to prove the join/state-sync
 * wiring end to end — real town/game logic lands in Phase 2-3.
 *
 * Join options are validated in onAuth (before the client is admitted)
 * rather than trusted directly in onJoin, so raw client input never
 * reaches authoritative state unchecked.
 */
export class TownRoom extends Room<TownRoomState> {
  maxClients = 40;

  /**
   * Latest validated move intent per player — a direction, not a position.
   * Kept out of the synced schema on purpose: only the resulting `x`/`y`
   * (computed below) is authoritative state other clients need to see.
   */
  private moveIntents = new Map<string, MoveIntentInput>();

  onCreate() {
    this.setState(new TownRoomState());
    this.setSimulationInterval(
      (deltaTimeMs) => this.movePlayers(deltaTimeMs),
      SIMULATION_INTERVAL_MS,
    );

    this.onMessage("move", (client, message: unknown) => {
      const parsed = moveIntentSchema.safeParse(message);
      if (!parsed.success) {
        return;
      }
      this.moveIntents.set(client.sessionId, parsed.data);
    });
  }

  onAuth(_client: Client, options: unknown): JoinRoomOptionsInput {
    const parsed = joinRoomOptionsSchema.safeParse(options);
    if (!parsed.success) {
      throw new ServerError(400, "Invalid join options");
    }
    return parsed.data;
  }

  onJoin(client: Client, _options: unknown, auth: JoinRoomOptionsInput) {
    const player = new PlayerState();
    player.sessionId = client.sessionId;
    player.nickname = auth.nickname;
    this.state.players.set(client.sessionId, player);
    this.moveIntents.set(client.sessionId, { dx: 0, dy: 0 });
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
    this.moveIntents.delete(client.sessionId);
  }

  /**
   * Applies each player's latest move intent for one simulation tick.
   * Diagonal input (dx and dy both at their max) is normalized so moving
   * diagonally is never faster than moving on a single axis.
   */
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
      player.x += intent.dx * scale;
      player.y += intent.dy * scale;
    }
  }
}
