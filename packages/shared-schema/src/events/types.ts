/**
 * Data-driven random/special event system — structure only.
 *
 * No concrete events are implemented in Phase 0. This exists so that
 * later phases (weather, seasons, surprise events like "raining tacos",
 * class-specific meme events, cooperative events) can be added as data
 * without changing room/engine code: new work should mean adding an
 * entry to a registry, not branching game logic.
 */

export type GameEventCategory =
  | "surprise"
  | "class_meme"
  | "seasonal"
  | "weather"
  | "cooperative";

export type GameEventTrigger =
  | { type: "admin_manual" }
  | { type: "schedule"; cronExpression: string }
  | { type: "condition"; description: string };

export interface GameEventDefinition {
  id: string;
  category: GameEventCategory;
  /** i18n key resolved via @classtown/i18n, never a hardcoded display string. */
  displayNameKey: string;
  trigger: GameEventTrigger;
}

/**
 * Empty on purpose. Concrete event definitions are added starting Phase 8.
 */
export const eventRegistry: readonly GameEventDefinition[] = [];
