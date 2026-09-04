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
  displayNameKey: string;
  trigger: GameEventTrigger;
}

export const eventRegistry: readonly GameEventDefinition[] = [];
