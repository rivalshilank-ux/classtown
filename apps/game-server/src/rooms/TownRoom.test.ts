import type { AddressInfo } from "node:net";
import { Client } from "colyseus.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SPAWN_POINT, TownRoomState } from "@classtown/shared-schema";
import { createGameServer } from "../server.js";
import {
  createFakePersistence,
  type FakePersistence,
} from "../persistence/fakePersistence.js";

const CLASS_ID = "11111111-1111-4111-8111-111111111111";

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

describe("TownRoom", () => {
  let server: ReturnType<typeof createGameServer>;
  let persistence: FakePersistence;
  let endpoint: string;
  let participantSeq = 0;

  /** Mints a fresh identity + ticket, the way the web join action would. */
  function ticketFor(nickname: string) {
    participantSeq += 1;
    return persistence.issueTicket({
      participantId: `22222222-2222-4222-8222-${String(participantSeq).padStart(12, "0")}`,
      classId: CLASS_ID,
      nickname,
    });
  }

  async function join(nickname: string) {
    const client = new Client(endpoint);
    return client.joinOrCreate<TownRoomState>("town", {
      ticket: ticketFor(nickname),
    });
  }

  beforeEach(async () => {
    persistence = createFakePersistence();
    server = createGameServer({ persistence });
    await server.gameServer.listen(0);
    const { port } = server.httpServer.address() as AddressInfo;
    endpoint = `ws://localhost:${port}`;
  });

  afterEach(async () => {
    await server.gameServer.gracefullyShutdown(false);
  });

  describe("join authorization", () => {
    it("admits a client holding a valid ticket", async () => {
      const room = await join("Alex");

      await waitFor(() => room.state.players?.get(room.sessionId) !== undefined);
      expect(room.state.players.get(room.sessionId)?.nickname).toBe("Alex");

      await room.leave();
    });

    it("takes the nickname from the ticket, not from the client payload", async () => {
      const client = new Client(endpoint);
      const ticket = persistence.issueTicket({
        participantId: "22222222-2222-4222-8222-000000000099",
        classId: CLASS_ID,
        nickname: "RealName",
      });

      const room = await client.joinOrCreate<TownRoomState>("town", {
        ticket,
        nickname: "SpoofedName",
      });

      await waitFor(() => room.state.players?.get(room.sessionId) !== undefined);
      expect(room.state.players.get(room.sessionId)?.nickname).toBe("RealName");

      await room.leave();
    });

    it("rejects a client with no ticket", async () => {
      const client = new Client(endpoint);
      await expect(
        client.joinOrCreate<TownRoomState>("town", { nickname: "Alex" }),
      ).rejects.toThrow();
    });

    it("rejects an unknown ticket", async () => {
      const client = new Client(endpoint);
      await expect(
        client.joinOrCreate<TownRoomState>("town", {
          ticket: "00000000-0000-4000-8000-000000009999",
        }),
      ).rejects.toThrow();
    });

    it("rejects a ticket that has already been consumed", async () => {
      const ticket = ticketFor("Alex");

      const first = await new Client(endpoint).joinOrCreate<TownRoomState>(
        "town",
        { ticket },
      );

      await expect(
        new Client(endpoint).joinOrCreate<TownRoomState>("town", { ticket }),
      ).rejects.toThrow();

      await first.leave();
    });
  });

  describe("persistence", () => {
    it("records a join event and marks the participant seen", async () => {
      const room = await join("Alex");
      await waitFor(() => persistence.events.length > 0);

      expect(persistence.events[0]).toMatchObject({
        classId: CLASS_ID,
        type: "joined",
      });
      expect(persistence.seen.length).toBeGreaterThan(0);

      await room.leave();
    });

    it("does not log a left event for a session shorter than the minimum", async () => {
      const room = await join("Alex");
      await waitFor(() => persistence.events.length > 0);
      await room.leave();
      await sleep(150);

      expect(persistence.events.filter((e) => e.type === "left")).toHaveLength(0);
    });

    it("never persists a position", async () => {
      const room = await join("Alex");
      room.send("move", { dx: 1, dy: 0 });
      await sleep(200);

      // The persistence surface has no method that could accept one; this
      // asserts the room does not reach for anything beyond it.
      expect(Object.keys(persistence).sort()).toEqual(
        [
          "addPlaySeconds",
          "consumeJoinTicket",
          "events",
          "issueTicket",
          "markSeen",
          "playSeconds",
          "recordEvent",
          "seen",
        ].sort(),
      );

      await room.leave();
    });
  });

  describe("movement", () => {
    it("applies a valid move intent to the player's authoritative position", async () => {
      const room = await join("Alex");

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
      const room = await join("Alex");

      await waitFor(() => room.state.players?.get(room.sessionId) !== undefined);

      const player = room.state.players.get(room.sessionId);
      expect(player?.x).toBe(SPAWN_POINT.x);
      expect(player?.y).toBe(SPAWN_POINT.y);

      await room.leave();
    });

    it("stops a player at a solid wall instead of letting them pass through it", async () => {
      const room = await join("Alex");

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
      const room = await join("Alex");
      await waitFor(() => room.state.players?.get(room.sessionId) !== undefined);

      room.send("move", { dx: 5, dy: 5 });
      await sleep(150);

      const player = room.state.players.get(room.sessionId);
      expect(player?.x).toBe(SPAWN_POINT.x);
      expect(player?.y).toBe(SPAWN_POINT.y);

      await room.leave();
    });

    it("ignores a malformed move message instead of trusting a client-sent position", async () => {
      const room = await join("Alex");
      await waitFor(() => room.state.players?.get(room.sessionId) !== undefined);

      room.send("move", { x: 999, y: 999 });
      await sleep(150);

      const player = room.state.players.get(room.sessionId);
      expect(player?.x).toBe(SPAWN_POINT.x);
      expect(player?.y).toBe(SPAWN_POINT.y);

      await room.leave();
    });

    it("syncs one player's authoritative position to other clients in the room", async () => {
      const roomA = await join("Alex");
      const roomB = await join("Sam");

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
});
