import type { AddressInfo } from "node:net";
import { Client } from "colyseus.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SPAWN_POINT, TownRoomState } from "@classtown/shared-schema";
import { createGameServer } from "../server.js";

const JOIN_OPTIONS = { joinCode: "ABCD1234", nickname: "Alex" };

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(
  predicate: () => boolean,
  { timeoutMs = 2000, intervalMs = 20 } = {},
) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) {
      return;
    }
    await sleep(intervalMs);
  }
  throw new Error(`Condition not met within ${timeoutMs}ms`);
}

describe("TownRoom move", () => {
  let server: ReturnType<typeof createGameServer>;
  let endpoint: string;

  beforeEach(async () => {
    server = createGameServer();
    await server.gameServer.listen(0);
    const { port } = server.httpServer.address() as AddressInfo;
    endpoint = `ws://localhost:${port}`;
  });

  afterEach(async () => {
    await server.gameServer.gracefullyShutdown(false);
  });

  it("applies a valid move intent to the player's authoritative position", async () => {
    const client = new Client(endpoint);
    const room = await client.joinOrCreate<TownRoomState>("town", JOIN_OPTIONS);

    room.send("move", { dx: 1, dy: 0 });

    await waitFor(() => {
      const player = room.state.players?.get(room.sessionId);
      return player !== undefined && player.x > SPAWN_POINT.x;
    });

    const player = room.state.players.get(room.sessionId);
    expect(player?.x).toBeGreaterThan(SPAWN_POINT.x);
    expect(player?.y).toBe(SPAWN_POINT.y);

    await room.leave();
  });

  it("spawns the player on the open plaza tile", async () => {
    const client = new Client(endpoint);
    const room = await client.joinOrCreate<TownRoomState>("town", JOIN_OPTIONS);

    await waitFor(() => room.state.players?.get(room.sessionId) !== undefined);

    const player = room.state.players.get(room.sessionId);
    expect(player?.x).toBe(SPAWN_POINT.x);
    expect(player?.y).toBe(SPAWN_POINT.y);

    await room.leave();
  });

  it("stops a player at a solid wall instead of letting them pass through it", async () => {
    const client = new Client(endpoint);
    const room = await client.joinOrCreate<TownRoomState>("town", JOIN_OPTIONS);

    // The shop's west wall sits ~320px east of the spawn plaza tile —
    // plenty close enough to reach well within this test's timeout.
    room.send("move", { dx: 1, dy: 0 });
    await sleep(2500);

    const stoppedAt = room.state.players.get(room.sessionId)?.x;
    await sleep(300);
    const afterMoreTime = room.state.players.get(room.sessionId)?.x;

    expect(stoppedAt).toBeGreaterThan(SPAWN_POINT.x);
    expect(afterMoreTime).toBe(stoppedAt);

    await room.leave();
  });

  it("ignores a move intent outside the validated range", async () => {
    const client = new Client(endpoint);
    const room = await client.joinOrCreate<TownRoomState>("town", JOIN_OPTIONS);

    room.send("move", { dx: 5, dy: 5 });
    await sleep(150);

    const player = room.state.players.get(room.sessionId);
    expect(player?.x).toBe(SPAWN_POINT.x);
    expect(player?.y).toBe(SPAWN_POINT.y);

    await room.leave();
  });

  it("ignores a malformed move message instead of trusting a client-sent position", async () => {
    const client = new Client(endpoint);
    const room = await client.joinOrCreate<TownRoomState>("town", JOIN_OPTIONS);

    room.send("move", { x: 999, y: 999 });
    await sleep(150);

    const player = room.state.players.get(room.sessionId);
    expect(player?.x).toBe(SPAWN_POINT.x);
    expect(player?.y).toBe(SPAWN_POINT.y);

    await room.leave();
  });

  it("syncs one player's authoritative position to other clients in the room", async () => {
    const clientA = new Client(endpoint);
    const clientB = new Client(endpoint);

    const roomA = await clientA.joinOrCreate<TownRoomState>(
      "town",
      JOIN_OPTIONS,
    );
    const roomB = await clientB.joinOrCreate<TownRoomState>("town", {
      ...JOIN_OPTIONS,
      nickname: "Sam",
    });

    roomA.send("move", { dx: 1, dy: 0 });

    await waitFor(() => {
      const playerOnB = roomB.state.players?.get(roomA.sessionId);
      return playerOnB !== undefined && playerOnB.x > SPAWN_POINT.x;
    });

    const playerOnA = roomA.state.players.get(roomA.sessionId);
    const playerOnB = roomB.state.players.get(roomA.sessionId);
    expect(playerOnB?.x).toBeGreaterThan(SPAWN_POINT.x);
    expect(playerOnB?.x).toBe(playerOnA?.x);

    await roomA.leave();
    await roomB.leave();
  });
});
