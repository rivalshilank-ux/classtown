import { MapSchema, Schema, type } from "@colyseus/schema";

/**
 * Authoritative per-player state, owned entirely by the server.
 * Clients only ever receive this via room state sync — they never
 * write to it directly (see @classtown/shared-schema/messages for the
 * validated messages clients are allowed to send instead).
 */
export class PlayerState extends Schema {
  @type("string") sessionId = "";
  @type("string") nickname = "";
  @type("string") characterId = "default";
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") score = 0;
}

/**
 * Root authoritative state for a town/game room.
 * `status` is only ever mutated by server-side room logic (e.g. in
 * response to a validated Admin command), never by client messages.
 */
export class TownRoomState extends Schema {
  @type("string") status: "waiting" | "in_progress" | "paused" | "ended" =
    "waiting";

  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
}
