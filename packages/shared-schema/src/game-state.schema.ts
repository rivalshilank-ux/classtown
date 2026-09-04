import { MapSchema, Schema, type } from "@colyseus/schema";

export class PlayerState extends Schema {
  @type("string") sessionId = "";
  @type("string") nickname = "";
  @type("string") characterId = "default";
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") score = 0;
}

export class TownRoomState extends Schema {
  @type("string") status: "waiting" | "in_progress" | "paused" | "ended" =
    "waiting";

  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
}
