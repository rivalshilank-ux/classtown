import Phaser from "phaser";
import { getStateCallbacks, type Room } from "colyseus.js";
import type { TownRoomState, MoveIntentInput } from "@classtown/shared-schema";
import type { KeyboardInput } from "../KeyboardInput";
import { computeMoveIntent, moveIntentsEqual } from "../input";
import { sendMoveIntent } from "../moveSender";

const LOCAL_PLAYER_COLOR = 0x38bdf8;
const REMOTE_PLAYER_COLOR = 0x94a3b8;
const PLAYER_OUTLINE_COLOR = 0x2a2015;
const PLAYER_RADIUS = 16;

export interface TownSceneData {
  room: Room<TownRoomState>;
  keyboard: KeyboardInput;
}

export class TownScene extends Phaser.Scene {
  private room!: Room<TownRoomState>;
  private keyboard!: KeyboardInput;
  private lastSentIntent: MoveIntentInput = { dx: 0, dy: 0 };
  private circles = new Map<string, Phaser.GameObjects.Arc>();
  private labels = new Map<string, Phaser.GameObjects.Text>();

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
      circle.setStrokeStyle(2, PLAYER_OUTLINE_COLOR);
      this.circles.set(sessionId, circle);

      const label = this.add
        .text(player.x, player.y - PLAYER_RADIUS - 6, player.nickname, {
          fontFamily: "var(--font-display), sans-serif",
          fontSize: "13px",
          color: "#fbf3e3",
          stroke: "#2a2015",
          strokeThickness: 3,
        })
        .setOrigin(0.5, 1);
      this.labels.set(sessionId, label);

      $(player).listen("x", (value) => {
        circle.setPosition(value, circle.y);
        label.setPosition(value, label.y);
      });
      $(player).listen("y", (value) => {
        circle.setPosition(circle.x, value);
        label.setPosition(label.x, value - PLAYER_RADIUS - 6);
      });
    });

    $(this.room.state).players.onRemove((_player, sessionId) => {
      this.circles.get(sessionId)?.destroy();
      this.circles.delete(sessionId);
      this.labels.get(sessionId)?.destroy();
      this.labels.delete(sessionId);
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
