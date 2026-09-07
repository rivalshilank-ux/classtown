import Phaser from "phaser";
import { getStateCallbacks, type Room } from "colyseus.js";
import {
  LANDMARKS,
  MAP_COLS,
  MAP_GRID,
  MAP_ROWS,
  TILE_SIZE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  type FacingDirection,
  type MoveIntentInput,
  type TileType,
  type TownRoomState,
} from "@classtown/shared-schema";
import type { KeyboardInput } from "../KeyboardInput";
import { computeMoveIntent, moveIntentsEqual } from "../input";
import { sendMoveIntent } from "../moveSender";
import {
  CHARACTER_HEIGHT,
  characterTextureKey,
  generateCharacterTextures,
  paletteIndexForSession,
  type CharacterFrame,
} from "../characterSprite";

/**
 * How long without a position update before a player is considered stopped.
 * The server ticks movement at 20Hz (50ms between updates while genuinely
 * moving), so this comfortably distinguishes "still moving" from "stopped"
 * without noticeable lag on the idle transition.
 */
const MOVEMENT_TIMEOUT_MS = 160;

/** How fast the two walk frames alternate while a player is moving. */
const WALK_FRAME_INTERVAL_MS = 150;

const CAMERA_ZOOM = 2;

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

interface PlayerVisual {
  sprite: Phaser.GameObjects.Sprite;
  label: Phaser.GameObjects.Text;
  localMarker?: Phaser.GameObjects.Ellipse;
  paletteIndex: number;
  direction: FacingDirection;
  frame: CharacterFrame;
  /** Scene-time (this.time.now) of the last x/y update from the server. */
  lastMoveAt: number;
  moving: boolean;
}

const LABEL_OFFSET_Y = CHARACTER_HEIGHT / 2 + 6;

export class TownScene extends Phaser.Scene {
  private room!: Room<TownRoomState>;
  private keyboard!: KeyboardInput;
  private lastSentIntent: MoveIntentInput = { dx: 0, dy: 0 };
  private players = new Map<string, PlayerVisual>();

  constructor() {
    super("town");
  }

  init(data: TownSceneData) {
    this.room = data.room;
    this.keyboard = data.keyboard;
  }

  create() {
    generateCharacterTextures(this);
    this.buildWorld();

    const $ = getStateCallbacks(this.room);

    $(this.room.state).players.onAdd((player, sessionId) => {
      const isLocal = sessionId === this.room.sessionId;
      const paletteIndex = paletteIndexForSession(sessionId);
      const direction: FacingDirection = player.direction;

      let localMarker: Phaser.GameObjects.Ellipse | undefined;
      if (isLocal) {
        localMarker = this.add.ellipse(player.x, player.y + 14, 22, 10, 0xfff3d6, 0.55);
        localMarker.setDepth(9);
      }

      const sprite = this.add.sprite(
        player.x,
        player.y,
        characterTextureKey(paletteIndex, direction, 0),
      );
      sprite.setDepth(10);

      const label = this.add
        .text(player.x, player.y - LABEL_OFFSET_Y, player.nickname, {
          fontFamily: "var(--font-display), sans-serif",
          fontSize: "13px",
          color: "#fbf3e3",
          backgroundColor: isLocal ? "#c97f1f" : "#5c3820",
          padding: { x: 5, y: 2 },
        })
        .setOrigin(0.5, 1)
        .setDepth(11);

      const visual: PlayerVisual = {
        sprite,
        label,
        localMarker,
        paletteIndex,
        direction,
        frame: 0,
        lastMoveAt: this.time.now,
        moving: false,
      };
      this.players.set(sessionId, visual);

      if (isLocal) {
        this.cameras.main.startFollow(sprite, true, 0.1, 0.1);
      }

      const onPositionChange = (x: number, y: number) => {
        sprite.setPosition(x, y);
        label.setPosition(x, y - LABEL_OFFSET_Y);
        localMarker?.setPosition(x, y + 14);
        visual.lastMoveAt = this.time.now;
        visual.moving = true;
      };
      $(player).listen("x", (value) => onPositionChange(value, sprite.y));
      $(player).listen("y", (value) => onPositionChange(sprite.x, value));

      $(player).listen("direction", (value: FacingDirection) => {
        visual.direction = value;
        sprite.setTexture(characterTextureKey(visual.paletteIndex, visual.direction, visual.frame));
      });
    });

    $(this.room.state).players.onRemove((_player, sessionId) => {
      const visual = this.players.get(sessionId);
      visual?.sprite.destroy();
      visual?.label.destroy();
      visual?.localMarker?.destroy();
      this.players.delete(sessionId);
    });
  }

  update() {
    this.updatePlayerAnimations();

    const intent = computeMoveIntent(this.keyboard.getState());
    if (!moveIntentsEqual(intent, this.lastSentIntent)) {
      sendMoveIntent(this.room, intent);
      this.lastSentIntent = intent;
    }
  }

  /**
   * Idle/walk state is derived client-side from how recently a player's
   * position last changed, rather than a server-broadcast "isMoving" flag --
   * one fewer schema field, and it works identically for the local and every
   * remote player off the same PlayerState.x/y updates already being synced.
   */
  private updatePlayerAnimations() {
    const now = this.time.now;
    const walkFrame: CharacterFrame = Math.floor(now / WALK_FRAME_INTERVAL_MS) % 2 === 0 ? 0 : 1;

    for (const visual of this.players.values()) {
      if (visual.moving && now - visual.lastMoveAt > MOVEMENT_TIMEOUT_MS) {
        visual.moving = false;
      }

      const targetFrame: CharacterFrame = visual.moving ? walkFrame : 0;
      if (targetFrame !== visual.frame) {
        visual.frame = targetFrame;
        visual.sprite.setTexture(
          characterTextureKey(visual.paletteIndex, visual.direction, visual.frame),
        );
      }
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
            backgroundColor: "#3a2415",
            padding: { x: 6, y: 3 },
          },
        )
        .setOrigin(0.5, 0.5)
        .setDepth(1);
    }

    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    // Zoomed in enough that a typical laptop viewport shows roughly a
    // quarter of the map at once -- the world reads as a place to explore
    // rather than something fully visible at a glance, and the character
    // stays clearly readable.
    this.cameras.main.setZoom(CAMERA_ZOOM);
  }
}
