import type Phaser from "phaser";
import type { FacingDirection } from "@classtown/shared-schema";

/**
 * Character art is drawn procedurally (Phaser Graphics -> generated texture),
 * the same technique TownScene already uses for the campus tiles. No image
 * assets exist in the repo yet, and this avoids sourcing external art (with
 * its licensing questions) for a Phase 13 foundation.
 *
 * A small fixed shirt-color palette gives players a visually distinct
 * identity without a real cosmetics system -- see docs/game/map.md /
 * character section of the Phase 13 plan.
 */
const SHIRT_PALETTE = [
  0xef8354, 0x5aa9e6, 0x8fd694, 0xf4d35e, 0xc77dff, 0xff8fa3,
] as const;

const SKIN_COLOR = 0xf0c896;
const HAIR_COLOR = 0x3a2415;
const OUTLINE_COLOR = 0x2a2015;

export const CHARACTER_WIDTH = 28;
export const CHARACTER_HEIGHT = 36;

export type CharacterFrame = 0 | 1;

const DIRECTIONS: readonly FacingDirection[] = ["down", "up", "left", "right"];
const FRAMES: readonly CharacterFrame[] = [0, 1];

export function paletteIndexForSession(sessionId: string): number {
  let hash = 0;
  for (let i = 0; i < sessionId.length; i++) {
    hash = (hash * 31 + sessionId.charCodeAt(i)) >>> 0;
  }
  return hash % SHIRT_PALETTE.length;
}

export function characterTextureKey(
  paletteIndex: number,
  direction: FacingDirection,
  frame: CharacterFrame,
): string {
  return `char-${paletteIndex}-${direction}-${frame}`;
}

/** Idempotent: safe to call once per scene create(), skips textures that already exist. */
export function generateCharacterTextures(scene: Phaser.Scene): void {
  for (let paletteIndex = 0; paletteIndex < SHIRT_PALETTE.length; paletteIndex++) {
    for (const direction of DIRECTIONS) {
      for (const frame of FRAMES) {
        const key = characterTextureKey(paletteIndex, direction, frame);
        if (scene.textures.exists(key)) {
          continue;
        }
        drawCharacterFrame(scene, key, SHIRT_PALETTE[paletteIndex]!, direction, frame);
      }
    }
  }
}

function drawCharacterFrame(
  scene: Phaser.Scene,
  key: string,
  shirtColor: number,
  direction: FacingDirection,
  frame: CharacterFrame,
): void {
  const g = scene.make.graphics({}, false);
  const cx = CHARACTER_WIDTH / 2;

  // Hair sits slightly higher/larger than the face circle drawn on top of
  // it, so only a fringe of it shows -- a simple "hair cap" look without
  // needing an arc path.
  g.fillStyle(HAIR_COLOR, 1);
  g.fillCircle(cx, 8, 8);
  g.fillStyle(SKIN_COLOR, 1);
  g.fillCircle(cx, 10, 7);
  g.lineStyle(1.5, OUTLINE_COLOR, 1);
  g.strokeCircle(cx, 10, 7);

  drawFace(g, cx, direction);

  // Body.
  g.fillStyle(shirtColor, 1);
  g.fillRoundedRect(cx - 8, 16, 16, 14, 4);
  g.lineStyle(2, OUTLINE_COLOR, 1);
  g.strokeRoundedRect(cx - 8, 16, 16, 14, 4);

  // Stub arms.
  g.fillStyle(SKIN_COLOR, 1);
  g.fillRoundedRect(cx - 11, 18, 4, 8, 2);
  g.fillRoundedRect(cx + 7, 18, 4, 8, 2);

  drawLegs(g, cx, frame);

  g.generateTexture(key, CHARACTER_WIDTH, CHARACTER_HEIGHT);
  g.destroy();
}

function drawFace(g: Phaser.GameObjects.Graphics, cx: number, direction: FacingDirection): void {
  g.fillStyle(OUTLINE_COLOR, 1);
  switch (direction) {
    case "down":
      g.fillCircle(cx - 3, 10, 1);
      g.fillCircle(cx + 3, 10, 1);
      break;
    case "left":
      g.fillCircle(cx - 4, 10, 1);
      break;
    case "right":
      g.fillCircle(cx + 4, 10, 1);
      break;
    case "up":
      // Back of the head -- no face.
      break;
  }
}

function drawLegs(g: Phaser.GameObjects.Graphics, cx: number, frame: CharacterFrame): void {
  g.fillStyle(OUTLINE_COLOR, 1);
  if (frame === 0) {
    g.fillRect(cx - 4, 29, 4, 6);
    g.fillRect(cx, 29, 4, 6);
  } else {
    g.fillRect(cx - 6, 28, 4, 7);
    g.fillRect(cx + 2, 30, 4, 5);
  }
}
