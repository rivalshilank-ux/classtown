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

  describe("maintenance mode", () => {
    it("rejects a new join while maintenance is active", async () => {
      persistence.setMaintenanceActive(true);
      const client = new Client(endpoint);

      await expect(
        client.joinOrCreate<TownRoomState>("town", { ticket: ticketFor("Alex") }),
      ).rejects.toThrow();
    });

    it("does not disconnect a player already in the room when maintenance starts mid-session", async () => {
      const room = await join("Alex");
      await waitFor(() => room.state.players?.get(room.sessionId) !== undefined);

      persistence.setMaintenanceActive(true);
      await sleep(150);

      expect(room.state.players.get(room.sessionId)?.nickname).toBe("Alex");
      room.send("move", { dx: 1, dy: 0 });
      await waitFor(() => (room.state.players.get(room.sessionId)?.x ?? 0) > SPAWN_POINT.x);

      await room.leave();
    });

    it("admits a new join again once maintenance ends", async () => {
      persistence.setMaintenanceActive(true);
      await expect(
        new Client(endpoint).joinOrCreate<TownRoomState>("town", {
          ticket: ticketFor("Alex"),
        }),
      ).rejects.toThrow();

      persistence.setMaintenanceActive(false);
      const room = await join("Sam");
      await waitFor(() => room.state.players?.get(room.sessionId) !== undefined);
      expect(room.state.players.get(room.sessionId)?.nickname).toBe("Sam");

      await room.leave();
    });
  });

  describe("reconnection", () => {
    it("drops the older session when the same participant joins a second time (multi-device)", async () => {
      const identity = {
        participantId: "22222222-2222-4222-8222-000000000042",
        classId: CLASS_ID,
        nickname: "Alex",
      };
      const firstTicket = persistence.issueTicket(identity);
      const first = await new Client(endpoint).joinOrCreate<TownRoomState>("town", {
        ticket: firstTicket,
      });
      await waitFor(() => first.state.players?.get(first.sessionId) !== undefined);

      let firstLeaveCode: number | undefined;
      first.onLeave((code) => {
        firstLeaveCode = code;
      });

      const secondTicket = persistence.issueTicket(identity);
      const second = await new Client(endpoint).joinOrCreate<TownRoomState>("town", {
        ticket: secondTicket,
      });
      await waitFor(() => second.state.players?.get(second.sessionId) !== undefined);

      await waitFor(() => firstLeaveCode !== undefined);
      await waitFor(() => second.state.players.size === 1);
      expect(second.state.players.get(second.sessionId)?.nickname).toBe("Alex");

      await second.leave();
    });

    it("does not drop a session belonging to a different participant", async () => {
      const alex = await join("Alex");
      await waitFor(() => alex.state.players?.get(alex.sessionId) !== undefined);

      const sam = await join("Sam");
      await waitFor(() => sam.state.players?.get(sam.sessionId) !== undefined);

      // Both still present -- reconnection only drops a match on participantId,
      // never merely "someone else joined the same room."
      await waitFor(() => alex.state.players.size === 2);

      await alex.leave();
      await sam.leave();
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
          "isMaintenanceActive",
          "issueTicket",
          "markSeen",
          "playSeconds",
          "recordEvent",
          "seen",
          "setMaintenanceActive",
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

  describe("dropped connection recovery", () => {
    // A short grace period so these tests don't take 20 real seconds each --
    // see TownRoomOptions.reconnectionGraceSeconds.
    let shortServer: ReturnType<typeof createGameServer>;
    let shortPersistence: FakePersistence;
    let shortEndpoint: string;
    let shortParticipantSeq = 0;

    function shortTicketFor(nickname: string) {
      shortParticipantSeq += 1;
      return shortPersistence.issueTicket({
        participantId: `33333333-3333-4333-8333-${String(shortParticipantSeq).padStart(12, "0")}`,
        classId: CLASS_ID,
        nickname,
      });
    }

    beforeEach(async () => {
      shortPersistence = createFakePersistence();
      shortServer = createGameServer({
        persistence: shortPersistence,
        reconnectionGraceSeconds: 0.3,
      });
      await shortServer.gameServer.listen(0);
      const { port } = shortServer.httpServer.address() as AddressInfo;
      shortEndpoint = `ws://localhost:${port}`;
    });

    afterEach(async () => {
      await shortServer.gameServer.gracefullyShutdown(false);
    });

    it("keeps the player in the room during an unconsented drop, and resumes the same session on reconnect", async () => {
      const client = new Client(shortEndpoint);
      const room = await client.joinOrCreate<TownRoomState>("town", {
        ticket: shortTicketFor("Alex"),
      });
      await waitFor(() => room.state.players?.get(room.sessionId) !== undefined);

      // Simulate a dropped connection, not a deliberate leave. The client
      // resolving this promise only means its own socket closed -- the
      // server's onLeave (and the allowReconnection() call inside it) runs
      // independently, so a moment is needed before a reconnect attempt can
      // find the window it opens.
      await room.leave(false);
      await sleep(100);

      // The reconnecting client is a fresh Client/Room pair from the SDK's
      // point of view, but resolves to the same sessionId server-side.
      const resumed = await new Client(shortEndpoint).reconnect<TownRoomState>(
        room.reconnectionToken,
      );

      expect(resumed.sessionId).toBe(room.sessionId);
      await waitFor(() => resumed.state.players?.get(resumed.sessionId) !== undefined);
      expect(resumed.state.players.get(resumed.sessionId)?.nickname).toBe("Alex");

      // No duplicate join, and no left event for the drop that was recovered from.
      expect(shortPersistence.events.filter((e) => e.type === "joined")).toHaveLength(1);
      expect(shortPersistence.events.filter((e) => e.type === "left")).toHaveLength(0);

      await resumed.leave();
    });

    it("cleans up normally once the grace period expires with no reconnection", async () => {
      const client = new Client(shortEndpoint);
      const room = await client.joinOrCreate<TownRoomState>("town", {
        ticket: shortTicketFor("Alex"),
      });
      await waitFor(() => room.state.players?.get(room.sessionId) !== undefined);

      await room.leave(false);

      // Wait past the 0.3s grace period without ever attempting to reconnect.
      // The session here is well under MIN_LOGGED_SESSION_MS, so a "left"
      // activity event is correctly never recorded (see the persistence
      // describe block above) -- markSeen() is the cleanup signal that
      // isn't gated by that threshold: it fires once on join and, once
      // more, only once real cleanup (not a lingering reconnection
      // reservation) has actually run.
      await waitFor(() => shortPersistence.seen.length >= 2);

      // A stale reconnection token past its window is rejected, not resumed.
      await expect(
        new Client(shortEndpoint).reconnect<TownRoomState>(room.reconnectionToken),
      ).rejects.toThrow();
    });

    it("does not open a reconnection window for a deliberate (consented) leave", async () => {
      const client = new Client(shortEndpoint);
      const room = await client.joinOrCreate<TownRoomState>("town", {
        ticket: shortTicketFor("Alex"),
      });
      await waitFor(() => room.state.players?.get(room.sessionId) !== undefined);

      await room.leave(true);
      await waitFor(() => shortPersistence.seen.length >= 2);

      // Cleaned up immediately -- well within what would otherwise be the
      // grace period -- and a reconnect attempt has nothing to resume.
      await expect(
        new Client(shortEndpoint).reconnect<TownRoomState>(room.reconnectionToken),
      ).rejects.toThrow();
    });

    it("never lets the frozen player keep sliding on stale movement input during the grace window", async () => {
      const client = new Client(shortEndpoint);
      const room = await client.joinOrCreate<TownRoomState>("town", {
        ticket: shortTicketFor("Alex"),
      });
      await waitFor(() => room.state.players?.get(room.sessionId) !== undefined);
      room.send("move", { dx: 1, dy: 0 });
      await waitFor(() => (room.state.players.get(room.sessionId)?.x ?? 0) > SPAWN_POINT.x);

      await room.leave(false);
      await sleep(100); // let onLeave clear the stale move intent

      const resumed = await new Client(shortEndpoint).reconnect<TownRoomState>(
        room.reconnectionToken,
      );
      await waitFor(() => resumed.state.players?.get(resumed.sessionId) !== undefined);

      // Nothing was driving the player for the rest of the grace window --
      // its position must be exactly as stable as any other idle player's,
      // not still coasting on the last intent it received before dropping.
      const positionAfterReconnect = resumed.state.players.get(resumed.sessionId)?.x;
      await sleep(150);
      expect(resumed.state.players.get(resumed.sessionId)?.x).toBe(positionAfterReconnect);

      await resumed.leave();
    });
  });
});
