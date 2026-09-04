import { Client, Room, ServerError } from "@colyseus/core";
import {
  joinRoomOptionsSchema,
  moveIntentSchema,
  PlayerState,
  TownRoomState,
  type JoinRoomOptionsInput,
  type MoveIntentInput,
} from "@classtown/shared-schema";

const MOVE_SPEED = 4;
const SIMULATION_INTERVAL_MS = 1000 / 20;

export class TownRoom extends Room<TownRoomState> {
  maxClients = 40;

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
