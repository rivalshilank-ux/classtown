import Phaser from "phaser";
import { getStateCallbacks, type Room } from "colyseus.js";
import type { TownRoomState, MoveIntentInput } from "@classtown/shared-schema";
import type { KeyboardInput } from "../KeyboardInput";
import { computeMoveIntent, moveIntentsEqual } from "../input";
import { sendMoveIntent } from "../moveSender";

const LOCAL_PLAYER_COLOR = 0x38bdf8;
const REMOTE_PLAYER_COLOR = 0x94a3b8;
const PLAYER_RADIUS = 16;

export interface TownSceneData {
  room: Room<TownRoomState>;
  keyboard: KeyboardInput;
}

/**
 * Placeholder rendering only — real sprites, map, and animation are a
 * later phase. Each player is a plain circle so multi-client sync is
 * visually obvious without any art: local player one color, everyone
 * else another.
 *
 * Position is never set locally from input — a circle only ever moves
 * because `PlayerState.x/y` (authoritative, server-computed) changed.
 */
export class TownScene extends Phaser.Scene {
  private room!: Room<TownRoomState>;
  private keyboard!: KeyboardInput;
  private lastSentIntent: MoveIntentInput = { dx: 0, dy: 0 };
  private circles = new Map<string, Phaser.GameObjects.Arc>();

  constructor() {
    super("town");
  }

  init(data: TownSceneData) {
    this.room = data.room;
    this.keyboard = data.keyboard;
  }

  create() {
    const $ = getStateCallbacks(this.room);

    $(this.room.state).players.onAdd((player, sessionId) => {
      const isLocal = sessionId === this.room.sessionId;
      const circle = this.add.circle(
        player.x,
        player.y,
        PLAYER_RADIUS,
        isLocal ? LOCAL_PLAYER_COLOR : REMOTE_PLAYER_COLOR,
      );
      this.circles.set(sessionId, circle);

      $(player).listen("x", (value) => circle.setPosition(value, circle.y));
      $(player).listen("y", (value) => circle.setPosition(circle.x, value));
    });

    $(this.room.state).players.onRemove((_player, sessionId) => {
      this.circles.get(sessionId)?.destroy();
      this.circles.delete(sessionId);
    });
  }

  update() {
    const intent = computeMoveIntent(this.keyboard.getState());
    if (!moveIntentsEqual(intent, this.lastSentIntent)) {
      sendMoveIntent(this.room, intent);
      this.lastSentIntent = intent;
    }
  }
}
