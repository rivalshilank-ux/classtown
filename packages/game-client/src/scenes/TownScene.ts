import Phaser from "phaser";
import { getStateCallbacks, type Room } from "colyseus.js";
import {
  LANDMARKS,
  MAP_COLS,
  MAP_GRID,
  MAP_ROWS,
  PLAYER_RADIUS,
  TILE_SIZE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  type MoveIntentInput,
  type TileType,
  type TownRoomState,
} from "@classtown/shared-schema";
import type { KeyboardInput } from "../KeyboardInput";
import { computeMoveIntent, moveIntentsEqual } from "../input";
import { sendMoveIntent } from "../moveSender";

const LOCAL_PLAYER_COLOR = 0x38bdf8;
const REMOTE_PLAYER_COLOR = 0x94a3b8;
const PLAYER_OUTLINE_COLOR = 0x2a2015;

const TILE_FILL: Record<TileType, number> = {
  grass: 0x5c9c43,
  wall: 0x7d4c28,
  floor: 0xe6c692,
  plaza: 0xc9bfa8,
  path: 0xd9c9a3,
  tree: 0x3f7530,
  bench: 0x7d4c28,
  water: 0x6fc3d9,
  fence: 0x3a2415,
  gate: 0xe8a13a,
  counter: 0x5c3820,
  desk: 0xc99457,
  shelf: 0x5c3820,
  lab_table: 0x9b9488,
  piano: 0x1c1712,
  goal: 0xfbf3e3,
  track: 0xc1440e,
  stage: 0xa06a3a,
};

const WALKABLE_TILES: ReadonlySet<TileType> = new Set([
  "grass",
  "floor",
  "plaza",
  "path",
  "gate",
  "track",
]);

const SOLID_TILE_OUTLINE = 0x2a2015;
const GROUND_TEXTURE_KEY = "campus-ground";

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
    this.buildWorld();

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
      circle.setDepth(10);
      this.circles.set(sessionId, circle);

      const label = this.add
        .text(player.x, player.y - PLAYER_RADIUS - 6, player.nickname, {
          fontFamily: "var(--font-display), sans-serif",
          fontSize: "13px",
          color: "#fbf3e3",
          stroke: "#2a2015",
          strokeThickness: 3,
        })
        .setOrigin(0.5, 1)
        .setDepth(11);
      this.labels.set(sessionId, label);

      if (isLocal) {
        this.cameras.main.startFollow(circle, true, 0.1, 0.1);
      }

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

  private buildWorld() {
    const graphics = this.make.graphics({}, false);

    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        const tile = MAP_GRID[row]![col]!;
        const x = col * TILE_SIZE;
        const y = row * TILE_SIZE;

        graphics.fillStyle(TILE_FILL[tile], 1);
        graphics.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        if (!WALKABLE_TILES.has(tile)) {
          graphics.lineStyle(2, SOLID_TILE_OUTLINE, 0.6);
          graphics.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
        }

        // Small top-down props so a room reads as "library" or "science room"
        // without anyone having to stop and read a label.
        switch (tile) {
          case "tree":
            graphics.fillStyle(0x5c3820, 1);
            graphics.fillRect(x + TILE_SIZE / 2 - 3, y + TILE_SIZE - 10, 6, 10);
            break;
          case "shelf":
            graphics.fillStyle(0xc99457, 1);
            for (const offset of [6, 14, 22]) {
              graphics.fillRect(x + 3, y + offset, TILE_SIZE - 6, 3);
            }
            break;
          case "desk":
            graphics.fillStyle(0x3a2415, 0.5);
            graphics.fillRect(x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8);
            break;
          case "lab_table":
            graphics.fillStyle(0x6fc3d9, 1);
            graphics.fillRect(x + 10, y + 10, 12, 12);
            break;
          case "piano":
            graphics.fillStyle(0xfbf3e3, 1);
            for (let i = 0; i < 4; i++) {
              graphics.fillRect(x + 2 + i * 7, y + TILE_SIZE - 10, 5, 8);
            }
            break;
          case "goal":
            graphics.lineStyle(2, 0x2a2015, 1);
            graphics.strokeRect(x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8);
            break;
          case "stage":
            graphics.fillStyle(0xe8a13a, 1);
            graphics.fillRect(x + 2, y + 2, TILE_SIZE - 4, 4);
            break;
          default:
            break;
        }
      }
    }

    graphics.generateTexture(GROUND_TEXTURE_KEY, WORLD_WIDTH, WORLD_HEIGHT);
    graphics.destroy();

    this.add.image(0, 0, GROUND_TEXTURE_KEY).setOrigin(0, 0).setDepth(0);

    for (const landmark of LANDMARKS) {
      this.add
        .text(
          landmark.col * TILE_SIZE + TILE_SIZE / 2,
          landmark.row * TILE_SIZE + TILE_SIZE / 2,
          landmark.label,
          {
            fontFamily: "var(--font-display), sans-serif",
            fontSize: "12px",
            color: "#fbf3e3",
            stroke: "#2a2015",
            strokeThickness: 3,
          },
        )
        .setOrigin(0.5, 0.5)
        .setDepth(1);
    }

    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  }
}
