import type { MoveIntentInput } from "@classtown/shared-schema";

export interface DirectionKeyState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export const IDLE_KEY_STATE: DirectionKeyState = {
  up: false,
  down: false,
  left: false,
  right: false,
};

export function computeMoveIntent(keys: DirectionKeyState): MoveIntentInput {
  const dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  const dy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);

  if (dx === 0 || dy === 0) {
    return { dx, dy };
  }

  const DIAGONAL_SCALE = Math.SQRT1_2;
  return { dx: dx * DIAGONAL_SCALE, dy: dy * DIAGONAL_SCALE };
}

export function moveIntentsEqual(a: MoveIntentInput, b: MoveIntentInput): boolean {
  return a.dx === b.dx && a.dy === b.dy;
}
