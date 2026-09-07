import Phaser from "phaser";
import { getStateCallbacks, type Room } from "colyseus.js";
import {
  INTERACTION_POINTS,
  INTERACTION_RANGE_PX,
  interactionPointCenter,
  LANDMARKS,
  MAP_COLS,
  MAP_GRID,
  MAP_ROWS,
  TILE_SIZE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  type DiscoveryProgress,
  type FacingDirection,
  type InteractResult,
  type MoveIntentInput,
  type PlayerDiscoveryEvent,
  type TileType,
  type TourCompletedEvent,
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

/** Client-side echo of the server's interact cooldown -- purely to avoid spamming
 * the network while a key is held/auto-repeating; the server enforces the real one. */
const LOCAL_INTERACT_COOLDOWN_MS = 400;
const DISCOVERY_BUBBLE_MS = 1400;
const TOUR_TOAST_MS = 3500;
const FEEDBACK_TEXT_MS = 1400;

const MARKER_UNDISCOVERED = { glyph: "★", bg: "#f4d35e", color: "#2a2015" };
const MARKER_DISCOVERED = { glyph: "✓", bg: "#8fd694", color: "#1c3d1c" };

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

  // Campus discovery tour (see docs/game/interaction.md).
  private interactionMarkers = new Map<string, Phaser.GameObjects.Text>();
  private discoveredIds = new Set<string>();
  private nearestPointId: string | null = null;
  private lastLocalInteractAt = 0;
  private interactPrompt!: Phaser.GameObjects.Text;
  private hudCounter!: Phaser.GameObjects.Text;
  private feedbackText!: Phaser.GameObjects.Text;
  private feedbackClearAt = 0;
  private tourToast?: Phaser.GameObjects.Text;

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

    this.buildInteractionMarkers();
    this.buildHud();

    this.room.onMessage("discovery_progress", (message: DiscoveryProgress) => {
      this.applyDiscoveredIds(message.discoveredIds);
    });

    this.room.onMessage("interact_result", (message: InteractResult) => {
      this.handleInteractResult(message);
    });

    this.room.onMessage("player_discovery", (message: PlayerDiscoveryEvent) => {
      this.showDiscoveryBubble(message);
    });

    this.room.onMessage("tour_completed", (message: TourCompletedEvent) => {
      this.showTourCompletedToast(message);
    });

    this.input.keyboard?.on("keydown-E", () => this.attemptInteract());

    // Sent only now that every onMessage listener above is registered --
    // see TownRoom's "request_progress" handler for why this can't be a
    // push from the server's onJoin instead.
    this.room.send("request_progress");
  }

  update() {
    this.updatePlayerAnimations();
    this.updateNearestInteractable();

    const intent = computeMoveIntent(this.keyboard.getState());
    if (!moveIntentsEqual(intent, this.lastSentIntent)) {
      sendMoveIntent(this.room, intent);
      this.lastSentIntent = intent;
    }
  }

  /** Every INTERACTION_POINTS entry gets a small badge in the world, swapped
   * to a "found" look once discovered -- see docs/game/interaction.md. */
  private buildInteractionMarkers() {
    for (const point of INTERACTION_POINTS) {
      const center = interactionPointCenter(point);
      const marker = this.add
        .text(center.x, center.y, MARKER_UNDISCOVERED.glyph, {
          fontSize: "16px",
          color: MARKER_UNDISCOVERED.color,
          backgroundColor: MARKER_UNDISCOVERED.bg,
          padding: { x: 4, y: 2 },
        })
        .setOrigin(0.5, 0.5)
        .setDepth(2);
      this.interactionMarkers.set(point.id, marker);
    }
  }

  private buildHud() {
    this.hudCounter = this.add
      .text(0, 0, "", {
        fontFamily: "var(--font-display), sans-serif",
        fontSize: "13px",
        color: "#fbf3e3",
        backgroundColor: "#3a2415",
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(100);
    this.updateHudCounter();

    this.interactPrompt = this.add
      .text(0, 0, "", {
        fontFamily: "var(--font-display), sans-serif",
        fontSize: "14px",
        color: "#2a2015",
        backgroundColor: "#f4d35e",
        padding: { x: 8, y: 5 },
      })
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(100)
      .setVisible(false);

    this.feedbackText = this.add
      .text(0, 0, "", {
        fontFamily: "var(--font-display), sans-serif",
        fontSize: "14px",
        color: "#fbf3e3",
        backgroundColor: "#5c3820",
        padding: { x: 8, y: 5 },
      })
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(100)
      .setVisible(false);

    this.layoutHud();
    this.scale.on("resize", () => this.layoutHud());
  }

  private layoutHud() {
    const { width, height } = this.scale;
    this.hudCounter.setPosition(width - 12, 12).setOrigin(1, 0);
    this.interactPrompt.setPosition(width / 2, height - 24);
    this.feedbackText.setPosition(width / 2, height - 60);
  }

  private updateHudCounter() {
    this.hudCounter.setText(`탐방 발견 ${this.discoveredIds.size}/${INTERACTION_POINTS.length}`);
  }

  private applyDiscoveredIds(ids: readonly string[]) {
    this.discoveredIds = new Set(ids);
    for (const [pointId, marker] of this.interactionMarkers) {
      const style = this.discoveredIds.has(pointId) ? MARKER_DISCOVERED : MARKER_UNDISCOVERED;
      marker.setText(style.glyph);
      marker.setColor(style.color);
      marker.setBackgroundColor(style.bg);
    }
    this.updateHudCounter();
  }

  private showFeedback(text: string) {
    this.feedbackText.setText(text).setVisible(true);
    this.feedbackClearAt = this.time.now + FEEDBACK_TEXT_MS;
  }

  /** Finds the closest interaction point to the local player and shows/hides
   * the "[E] ..." prompt -- purely a UI convenience; the server independently
   * re-checks range on every interact attempt regardless of what this says. */
  private updateNearestInteractable() {
    const local = this.players.get(this.room.sessionId);

    if (this.feedbackText && this.time.now > this.feedbackClearAt) {
      this.feedbackText.setVisible(false);
    }

    if (!local) {
      this.nearestPointId = null;
      this.interactPrompt?.setVisible(false);
      return;
    }

    let closestId: string | null = null;
    let closestDistance = Infinity;
    let closestLabel = "";
    for (const point of INTERACTION_POINTS) {
      const center = interactionPointCenter(point);
      const distance = Math.hypot(local.sprite.x - center.x, local.sprite.y - center.y);
      if (distance <= INTERACTION_RANGE_PX && distance < closestDistance) {
        closestDistance = distance;
        closestId = point.id;
        closestLabel = point.label;
      }
    }

    this.nearestPointId = closestId;
    if (closestId) {
      this.interactPrompt.setText(`[E] ${closestLabel} 조사하기`).setVisible(true);
    } else {
      this.interactPrompt.setVisible(false);
    }
  }

  private attemptInteract() {
    if (!this.nearestPointId) {
      return;
    }
    const now = this.time.now;
    if (now - this.lastLocalInteractAt < LOCAL_INTERACT_COOLDOWN_MS) {
      return;
    }
    this.lastLocalInteractAt = now;
    this.room.send("interact", { pointId: this.nearestPointId });
  }

  private handleInteractResult(result: InteractResult) {
    if (!result.ok) {
      if (result.reason === "out_of_range") {
        this.showFeedback("너무 멀어요");
      }
      return;
    }

    this.applyDiscoveredIds(result.discoveredIds ?? []);
    this.showFeedback(result.alreadyDiscovered ? "이미 확인했어요" : `발견! ${result.label}`);
  }

  private showDiscoveryBubble(event: PlayerDiscoveryEvent) {
    const visual = this.players.get(event.sessionId);
    if (!visual) {
      return;
    }

    const bubble = this.add
      .text(visual.sprite.x, visual.sprite.y - LABEL_OFFSET_Y - 18, `✨ ${event.label} 발견!`, {
        fontFamily: "var(--font-display), sans-serif",
        fontSize: "12px",
        color: "#2a2015",
        backgroundColor: "#f4d35e",
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5, 1)
      .setDepth(12);

    this.tweens.add({
      targets: bubble,
      y: bubble.y - 16,
      alpha: 0,
      duration: DISCOVERY_BUBBLE_MS,
      onComplete: () => bubble.destroy(),
    });
  }

  private showTourCompletedToast(event: TourCompletedEvent) {
    this.tourToast?.destroy();

    this.tourToast = this.add
      .text(0, 0, `🎉 ${event.nickname}님이 학교 탐방을 완료했어요!`, {
        fontFamily: "var(--font-display), sans-serif",
        fontSize: "16px",
        color: "#fbf3e3",
        backgroundColor: "#c97f1f",
        padding: { x: 12, y: 8 },
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(101);
    this.tourToast.setPosition(this.scale.width / 2, 16);

    this.time.delayedCall(TOUR_TOAST_MS, () => {
      this.tourToast?.destroy();
      this.tourToast = undefined;
    });
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
