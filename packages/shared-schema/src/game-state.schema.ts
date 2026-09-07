import { MapSchema, Schema, type } from "@colyseus/schema";

export type FacingDirection = "up" | "down" | "left" | "right";

export class PlayerState extends Schema {
  @type("string") sessionId = "";
  @type("string") nickname = "";
  @type("string") characterId = "default";
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") score = 0;
  /**
   * Last direction the player moved (or tried to move) toward. Server-set
   * only, from the move intent -- not from whether the move actually
   * succeeded, so pushing into a wall still turns the character to face it.
   */
  @type("string") direction: FacingDirection = "down";
}

export class TownRoomState extends Schema {
  @type("string") status: "waiting" | "in_progress" | "paused" | "ended" =
    "waiting";

  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
}
