import type { AddressInfo } from "node:net";
import { Client } from "colyseus.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  INTERACTION_POINTS,
  interactionPointCenter,
  isSolidAtPixel,
  isSolidTile,
  MAP_COLS,
  MAP_ROWS,
  SPAWN_POINT,
  TILE_SIZE,
  tileTypeAt,
  TownRoomState,
  type AnnouncementEvent,
  type ChatBroadcastEvent,
  type ChatRejection,
  type DiscoveryProgress,
  type InteractResult,
  type PlayerDiscoveryEvent,
  type TourCompletedEvent,
} from "@classtown/shared-schema";
import { createGameServer } from "../server.js";
import {
  createFakePersistence,
  type FakePersistence,
} from "../persistence/fakePersistence.js";

const CLASS_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_CLASS_ID = "33333333-3333-4333-8333-333333333333";

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

/** Waits until `getValue()` returns the same reading on two polls in a row,
 * `intervalMs` apart. `waitFor`'s predicate fires once immediately on entry
 * (before any sleep), so comparing against a value captured just before
 * calling it can trivially "match" with zero real elapsed time -- this
 * always sleeps before every comparison, including the first. */
async function waitForStableValue<T>(
  getValue: () => T,
  { intervalMs = 150, timeoutMs = 5000 } = {},
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let previous = getValue();
  while (Date.now() < deadline) {
    await sleep(intervalMs);
    const current = getValue();
    if (current === previous) {
      return current;
    }
    previous = current;
  }
  throw new Error(`Value never stabilized within ${timeoutMs}ms`);
}

/** Resolves with the next message of the given type -- interact_result et al. are private replies, not state. */
function onceMessage<T>(room: { onMessage: (type: string, cb: (m: T) => void) => void }, type: string) {
  return new Promise<T>((resolve) => {
    room.onMessage(type, (message: T) => resolve(message));
  });
}

/** BFS over the real tile grid (4-directional, walls/solids as declared by
 * the actual map) -- most interaction points sit inside walled rooms, so
 * straight-line steering would just walk the player into a wall. Several
 * interaction points also sit exactly on a solid decorative tile (e.g.
 * stage.event), so the destination is the nearest walkable tile to the
 * point, not necessarily the point's own tile. */
function findWalkableTileNear(col: number, row: number): { col: number; row: number } {
  if (!isSolidTile(tileTypeAt(col, row))) {
    return { col, row };
  }
  for (const [dc, dr] of [[0, -1], [0, 1], [-1, 0], [1, 0]] as const) {
    const c = col + dc;
    const r = row + dr;
    if (!isSolidTile(tileTypeAt(c, r))) {
      return { col: c, row: r };
    }
  }
  throw new Error(`No walkable tile adjacent to (${col},${row})`);
}

function findPath(
  start: { col: number; row: number },
  goal: { col: number; row: number },
): Array<{ col: number; row: number }> {
  const key = (c: number, r: number) => `${c},${r}`;
  const visited = new Set([key(start.col, start.row)]);
  const cameFrom = new Map<string, { col: number; row: number }>();
  const queue: Array<{ col: number; row: number }> = [start];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.col === goal.col && current.row === goal.row) {
      const path: Array<{ col: number; row: number }> = [current];
      let k = key(current.col, current.row);
      while (cameFrom.has(k)) {
        const prev = cameFrom.get(k)!;
        path.unshift(prev);
        k = key(prev.col, prev.row);
      }
      return path;
    }

    for (const [dc, dr] of [[0, -1], [0, 1], [-1, 0], [1, 0]] as const) {
      const col = current.col + dc;
      const row = current.row + dr;
      if (col < 0 || col >= MAP_COLS || row < 0 || row >= MAP_ROWS) continue;
      if (isSolidTile(tileTypeAt(col, row))) continue;
      const k = key(col, row);
      if (visited.has(k)) continue;
      visited.add(k);
      cameFrom.set(k, current);
      queue.push({ col, row });
    }
  }

  throw new Error(`No walkable path from (${start.col},${start.row}) to (${goal.col},${goal.row})`);
}

function toTile(pixel: { x: number; y: number }) {
  return { col: Math.floor(pixel.x / TILE_SIZE), row: Math.floor(pixel.y / TILE_SIZE) };
}

function tilePixelCenter(tile: { col: number; row: number }) {
  return { x: tile.col * TILE_SIZE + TILE_SIZE / 2, y: tile.row * TILE_SIZE + TILE_SIZE / 2 };
}

/** Walks the player, via a real wall-aware path, until within interact
 * range of the target pixel position (an interaction point's own center,
 * which may itself be a solid decorative tile -- see findWalkableTileNear). */
async function moveNear(
  room: { send: (type: string, message: unknown) => void; sessionId: string; state: TownRoomState },
  target: { x: number; y: number },
  { timeoutMs = 15000 } = {},
) {
  const player = room.state.players.get(room.sessionId);
  if (!player) throw new Error("player not in room state yet");

  const startTile = toTile(player);
  // The walkable tile nearest the target, not necessarily the target's own
  // tile -- several interaction points sit exactly on a solid decorative
  // tile (a lab table, a counter, the event stage), same as the room's own
  // findWalkableTileNear handles for a real player. That tile's center is
  // always within one tile-step (<=32px) of the target, comfortably inside
  // INTERACTION_RANGE_PX (44px), so there's no need to path any closer to
  // the (possibly unreachable) exact target pixel.
  const goalTile = findWalkableTileNear(toTile(target).col, toTile(target).row);
  const path = findPath(startTile, goalTile);
  const waypoints = path.map(tilePixelCenter);
  const TILE_ARRIVAL_RADIUS = 14;
  let waypointIndex = 0;

  const steer = setInterval(() => {
    const current = room.state.players.get(room.sessionId);
    if (!current || waypoints.length === 0) return;

    while (
      waypointIndex < waypoints.length - 1 &&
      Math.hypot(current.x - waypoints[waypointIndex]!.x, current.y - waypoints[waypointIndex]!.y) <
        TILE_ARRIVAL_RADIUS
    ) {
      waypointIndex += 1;
    }

    const wp = waypoints[waypointIndex]!;
    const dx = wp.x - current.x;
    const dy = wp.y - current.y;
    const distance = Math.hypot(dx, dy) || 1;
    // Ease in as the player nears the waypoint it's currently steering
    // toward -- at speeds above default MOVE_SPEED, a constant full-speed
    // vector would blow past a ~14px arrival window in a single 50ms tick
    // and overshoot back and forth indefinitely.
    const speedScale = Math.max(Math.min(1, distance / (TILE_ARRIVAL_RADIUS * 2)), 0.08);
    room.send("move", { dx: (dx / distance) * speedScale, dy: (dy / distance) * speedScale });
  }, 50);

  try {
    if (waypoints.length === 0) {
      // Already standing on (or adjacent to) the target's own walkable tile.
    } else {
      await waitFor(
        () => {
          const current = room.state.players.get(room.sessionId);
          const last = waypoints[waypoints.length - 1]!;
          return !!current && Math.hypot(current.x - last.x, current.y - last.y) < TILE_ARRIVAL_RADIUS;
        },
        { timeoutMs },
      );
    }
    // Lets the stop command take effect and any in-flight simulation ticks
    // settle before the caller sends "interact" right after this returns --
    // both that message and this stop have network latency to cross.
    clearInterval(steer);
    room.send("move", { dx: 0, dy: 0 });
    await sleep(150);
  } finally {
    clearInterval(steer);
    room.send("move", { dx: 0, dy: 0 });
  }
}

describe("TownRoom", () => {
  let server: ReturnType<typeof createGameServer>;
  let persistence: FakePersistence;
  let endpoint: string;
  let participantSeq = 0;

  /** Mints a fresh identity + ticket, the way the web join action would. */
  function ticketFor(nickname: string, classId: string = CLASS_ID) {
    participantSeq += 1;
    return persistence.issueTicket({
      participantId: `22222222-2222-4222-8222-${String(participantSeq).padStart(12, "0")}`,
      classId,
      nickname,
    });
  }

  async function join(nickname: string, classId: string = CLASS_ID) {
    const client = new Client(endpoint);
    return client.joinOrCreate<TownRoomState>("town", {
      ticket: ticketFor(nickname, classId),
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
          "deliveredAnnouncementIds",
          "events",
          "isMaintenanceActive",
          "issueTicket",
          "markAnnouncementsDelivered",
          "markSeen",
          "playSeconds",
          "pollPendingAnnouncements",
          "queueAnnouncement",
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
      await waitFor(() => room.state.players?.get(room.sessionId) !== undefined);
      const spawn = room.state.players.get(room.sessionId)!;
      const spawnX = spawn.x;
      const spawnY = spawn.y;

      room.send("move", { dx: 1, dy: 0 });

      await waitFor(() => (room.state.players.get(room.sessionId)?.x ?? spawnX) > spawnX);

      const player = room.state.players.get(room.sessionId);
      expect(player?.x).toBeGreaterThan(spawnX);
      expect(player?.y).toBe(spawnY);
      expect(player?.direction).toBe("right");

      await room.leave();
    });

    it("spawns the player on a walkable tile near the plaza", async () => {
      const room = await join("Alex");

      await waitFor(() => room.state.players?.get(room.sessionId) !== undefined);

      const player = room.state.players.get(room.sessionId);
      expect(player).toBeDefined();
      expect(isSolidAtPixel(player!.x, player!.y)).toBe(false);
      expect(Math.hypot(player!.x - SPAWN_POINT.x, player!.y - SPAWN_POINT.y)).toBeLessThanOrEqual(
        48,
      );
      expect(player?.direction).toBe("down");

      await room.leave();
    });

    it("scatters simultaneous joiners instead of stacking them on one pixel", async () => {
      const rooms = await Promise.all([join("A"), join("B"), join("C"), join("D")]);
      await Promise.all(
        rooms.map((room) => waitFor(() => room.state.players?.get(room.sessionId) !== undefined)),
      );

      const positions = rooms.map((room) => {
        const player = room.state.players.get(room.sessionId)!;
        return `${player.x},${player.y}`;
      });
      expect(new Set(positions).size).toBe(positions.length);

      await Promise.all(rooms.map((room) => room.leave()));
    });

    it("stops a player at a solid wall instead of letting them pass through it", async () => {
      const room = await join("Alex");
      await waitFor(() => room.state.players?.get(room.sessionId) !== undefined);
      const spawnX = room.state.players.get(room.sessionId)!.x;

      room.send("move", { dx: 1, dy: 0 });

      // Confirm movement actually started before watching for it to stop --
      // otherwise the stability check below could trivially "converge" on
      // the pre-movement spawn position if it starts polling before the
      // move message has even been processed.
      await waitFor(() => (room.state.players.get(room.sessionId)?.x ?? spawnX) > spawnX + 4);

      // Jittered spawn (see pickSpawnPosition) makes the exact time-to-wall
      // variable, so wait for position to actually stop changing rather than
      // assuming a fixed sleep is long enough.
      const stoppedAt = await waitForStableValue(() => room.state.players.get(room.sessionId)?.x, {
        timeoutMs: 5000,
        intervalMs: 150,
      });
      await sleep(300);
      const afterMoreTime = room.state.players.get(room.sessionId)?.x;

      expect(stoppedAt).toBeGreaterThan(spawnX);
      expect(afterMoreTime).toBe(stoppedAt);

      await room.leave();
    });

    it("ignores a move intent outside the validated range", async () => {
      const room = await join("Alex");
      await waitFor(() => room.state.players?.get(room.sessionId) !== undefined);
      const spawn = room.state.players.get(room.sessionId)!;
      const spawnX = spawn.x;
      const spawnY = spawn.y;

      room.send("move", { dx: 5, dy: 5 });
      await sleep(150);

      const player = room.state.players.get(room.sessionId);
      expect(player?.x).toBe(spawnX);
      expect(player?.y).toBe(spawnY);

      await room.leave();
    });

    it("ignores a malformed move message instead of trusting a client-sent position", async () => {
      const room = await join("Alex");
      await waitFor(() => room.state.players?.get(room.sessionId) !== undefined);
      const spawn = room.state.players.get(room.sessionId)!;
      const spawnX = spawn.x;
      const spawnY = spawn.y;

      room.send("move", { x: 999, y: 999 });
      await sleep(150);

      const player = room.state.players.get(room.sessionId);
      expect(player?.x).toBe(spawnX);
      expect(player?.y).toBe(spawnY);

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

  describe("interaction (campus discovery tour)", () => {
    // Open ground right by spawn -- fast and reachable in a near-straight
    // line, so the single-point behavioral tests below don't each pay for a
    // full cross-map walk through doors. The full tour test still exercises
    // pathfinding into every walled room.
    const firstPoint = INTERACTION_POINTS.find((p) => p.id === "notice.plaza")!;
    const firstPointCenter = interactionPointCenter(firstPoint);
    const farPoint = INTERACTION_POINTS.find((p) => p.id === "sign.playground")!;

    it("discovers a point the player is within range of", async () => {
      const room = await join("Alex");
      await waitFor(() => room.state.players?.get(room.sessionId) !== undefined);
      await moveNear(room, firstPointCenter);

      const resultPromise = onceMessage<InteractResult>(room, "interact_result");
      room.send("interact", { pointId: firstPoint.id });
      const result = await resultPromise;

      expect(result).toMatchObject({
        ok: true,
        pointId: firstPoint.id,
        label: firstPoint.label,
        alreadyDiscovered: false,
        totalCount: INTERACTION_POINTS.length,
      });
      expect(result.discoveredIds).toContain(firstPoint.id);

      await room.leave();
    }, 10000);

    it("reports alreadyDiscovered on a repeat interaction instead of erroring", async () => {
      const room = await join("Alex");
      await waitFor(() => room.state.players?.get(room.sessionId) !== undefined);
      await moveNear(room, firstPointCenter);

      const first = onceMessage<InteractResult>(room, "interact_result");
      room.send("interact", { pointId: firstPoint.id });
      const firstResult = await first;
      expect(firstResult).toMatchObject({ ok: true, alreadyDiscovered: false });

      await sleep(450); // past the per-player interact cooldown

      const second = onceMessage<InteractResult>(room, "interact_result");
      room.send("interact", { pointId: firstPoint.id });
      const result = await second;

      expect(result).toMatchObject({ ok: true, alreadyDiscovered: true });

      await room.leave();
    }, 10000);

    it("rejects an unknown point id", async () => {
      const room = await join("Alex");
      await waitFor(() => room.state.players?.get(room.sessionId) !== undefined);

      const resultPromise = onceMessage<InteractResult>(room, "interact_result");
      room.send("interact", { pointId: "not-a-real-point" });
      const result = await resultPromise;

      expect(result).toMatchObject({ ok: false, reason: "unknown_point" });

      await room.leave();
    });

    it("rejects an interaction with a point that's out of range", async () => {
      const room = await join("Alex");
      await waitFor(() => room.state.players?.get(room.sessionId) !== undefined);
      // Never moved from spawn -- every real point is well outside range from there.

      const resultPromise = onceMessage<InteractResult>(room, "interact_result");
      room.send("interact", { pointId: farPoint.id });
      const result = await resultPromise;

      expect(result).toMatchObject({ ok: false, reason: "out_of_range" });

      await room.leave();
    });

    it("ignores forged progress/reward fields and computes the result itself", async () => {
      const room = await join("Alex");
      await waitFor(() => room.state.players?.get(room.sessionId) !== undefined);
      await moveNear(room, firstPointCenter);

      // A client claiming it already found everything, or a reward amount,
      // has no effect -- interactMessageSchema keeps only pointId, same as
      // moveIntentSchema stripping anything beyond dx/dy.
      const resultPromise = onceMessage<InteractResult>(room, "interact_result");
      room.send("interact", {
        pointId: firstPoint.id,
        alreadyDiscovered: false,
        discoveredIds: INTERACTION_POINTS.map((p) => p.id),
        totalCount: 99,
        reward: 999999,
      });
      const result = await resultPromise;

      expect(result).toMatchObject({
        ok: true,
        alreadyDiscovered: false,
        totalCount: INTERACTION_POINTS.length,
      });
      // The server's own count of one real discovery, not the forged 8-point claim.
      expect(result.discoveredIds).toEqual([firstPoint.id]);

      await room.leave();
    }, 10000);

    it("enforces a per-player cooldown between interactions", async () => {
      const room = await join("Alex");
      await waitFor(() => room.state.players?.get(room.sessionId) !== undefined);
      await moveNear(room, firstPointCenter);

      const received: InteractResult[] = [];
      room.onMessage("interact_result", (m: InteractResult) => received.push(m));

      room.send("interact", { pointId: firstPoint.id });
      room.send("interact", { pointId: firstPoint.id });
      await sleep(150);
      expect(received).toHaveLength(1);

      await sleep(350); // past the 400ms cooldown
      room.send("interact", { pointId: firstPoint.id });
      await waitFor(() => received.length === 2);

      await room.leave();
    }, 10000);

    it("broadcasts a player_discovery event other clients can see", async () => {
      const alex = await join("Alex");
      const sam = await join("Sam");
      await waitFor(() => alex.state.players?.get(alex.sessionId) !== undefined);
      await waitFor(() => sam.state.players?.get(sam.sessionId) !== undefined);

      const discoveryOnSam = onceMessage<PlayerDiscoveryEvent>(sam, "player_discovery");
      await moveNear(alex, firstPointCenter);
      alex.send("interact", { pointId: firstPoint.id });

      const event = await discoveryOnSam;
      expect(event).toMatchObject({
        sessionId: alex.sessionId,
        nickname: "Alex",
        label: firstPoint.label,
      });

      await alex.leave();
      await sam.leave();
    }, 10000);

    it("keeps a player's discoveries across a real dropped-connection reconnect", async () => {
      // A *consented* leave+rejoin (a fresh ticket, a fresh session) is a
      // deliberate quit -- if that empties the room, Colyseus disposes it,
      // and a later join creates a brand new TownRoom with nothing in
      // memory. That's expected and matches every other in-memory room
      // state (e.g. position). The actual "student's WiFi blips" reconnect
      // this system needs to survive never empties the room in the first
      // place -- allowReconnection (see onLeave) keeps it alive for exactly
      // that reason, which is what this test exercises instead.
      const reconnectServer = createGameServer({ persistence, reconnectionGraceSeconds: 2 });
      await reconnectServer.gameServer.listen(0);
      const { port } = reconnectServer.httpServer.address() as AddressInfo;
      const reconnectEndpoint = `ws://localhost:${port}`;

      try {
        const client = new Client(reconnectEndpoint);
        const room = await client.joinOrCreate<TownRoomState>("town", {
          ticket: persistence.issueTicket({
            participantId: "22222222-2222-4222-8222-000000000777",
            classId: CLASS_ID,
            nickname: "Alex",
          }),
        });
        await waitFor(() => room.state.players?.get(room.sessionId) !== undefined);
        await moveNear(room, firstPointCenter);

        const firstResultPromise = onceMessage<InteractResult>(room, "interact_result");
        room.send("interact", { pointId: firstPoint.id });
        const firstResult = await firstResultPromise;
        expect(firstResult).toMatchObject({ ok: true, alreadyDiscovered: false });

        await room.leave(false); // unconsented drop -- opens the reconnection window
        await sleep(100);

        const resumed = await new Client(reconnectEndpoint).reconnect<TownRoomState>(
          room.reconnectionToken,
        );
        await waitFor(() => resumed.state.players?.get(resumed.sessionId) !== undefined);

        const restoredPromise = onceMessage<DiscoveryProgress>(resumed, "discovery_progress");
        resumed.send("request_progress");
        const restored = await restoredPromise;

        expect(restored.discoveredIds).toContain(firstPoint.id);
        expect(restored.totalCount).toBe(INTERACTION_POINTS.length);

        await resumed.leave();
      } finally {
        await reconnectServer.gameServer.gracefullyShutdown(false);
      }
    }, 10000);

    it("completes the tour, broadcasts tour_completed, and records a durable milestone once every point is found", async () => {
      const fastServer = createGameServer({ persistence, moveSpeed: 400 });
      await fastServer.gameServer.listen(0);
      const { port } = fastServer.httpServer.address() as AddressInfo;
      const fastEndpoint = `ws://localhost:${port}`;

      try {
        const alex = new Client(fastEndpoint);
        const alexRoom = await alex.joinOrCreate<TownRoomState>("town", {
          ticket: persistence.issueTicket({
            participantId: "22222222-2222-4222-8222-000000000888",
            classId: CLASS_ID,
            nickname: "Alex",
          }),
        });
        const sam = new Client(fastEndpoint);
        const samRoom = await sam.joinOrCreate<TownRoomState>("town", {
          ticket: persistence.issueTicket({
            participantId: "22222222-2222-4222-8222-000000000889",
            classId: CLASS_ID,
            nickname: "Sam",
          }),
        });
        await waitFor(() => alexRoom.state.players?.get(alexRoom.sessionId) !== undefined);
        await waitFor(() => samRoom.state.players?.get(samRoom.sessionId) !== undefined);

        const completedOnSam = onceMessage<TourCompletedEvent>(samRoom, "tour_completed");

        for (const point of INTERACTION_POINTS) {
          await moveNear(alexRoom, interactionPointCenter(point), { timeoutMs: 20000 });
          const resultPromise = onceMessage<InteractResult>(alexRoom, "interact_result");
          alexRoom.send("interact", { pointId: point.id });
          const result = await resultPromise;
          expect(result.ok).toBe(true);
        }

        const completedEvent = await completedOnSam;
        expect(completedEvent).toMatchObject({ sessionId: alexRoom.sessionId, nickname: "Alex" });

        await waitFor(() =>
          persistence.events.some(
            (e) => e.type === "activity_completed" && e.participantId === "22222222-2222-4222-8222-000000000888",
          ),
        );
        const completionEvent = persistence.events.find((e) => e.type === "activity_completed");
        expect(completionEvent?.payload).toMatchObject({ activity: "campus_tour" });

        await alexRoom.leave();
        await samRoom.leave();
      } finally {
        await fastServer.gameServer.gracefullyShutdown(false);
      }
    }, 90000);
  });

  describe("chat", () => {
    it("broadcasts a valid message to every client in the room, including the sender", async () => {
      const alex = await join("Alex");
      const sam = await join("Sam");
      await waitFor(() => alex.state.players?.get(alex.sessionId) !== undefined);
      await waitFor(() => sam.state.players?.get(sam.sessionId) !== undefined);

      const onSam = onceMessage<ChatBroadcastEvent>(sam, "chat");
      const onAlex = onceMessage<ChatBroadcastEvent>(alex, "chat");
      alex.send("chat", { text: "안녕!" });

      const [receivedBySam, receivedByAlex] = await Promise.all([onSam, onAlex]);
      expect(receivedBySam).toMatchObject({ sessionId: alex.sessionId, nickname: "Alex", text: "안녕!" });
      expect(receivedByAlex).toMatchObject({ sessionId: alex.sessionId, nickname: "Alex", text: "안녕!" });

      await alex.leave();
      await sam.leave();
    });

    it("takes the sender identity from server-held state, not from the message payload", async () => {
      const alex = await join("Alex");
      const sam = await join("Sam");
      await waitFor(() => alex.state.players?.get(alex.sessionId) !== undefined);
      await waitFor(() => sam.state.players?.get(sam.sessionId) !== undefined);

      const onSam = onceMessage<ChatBroadcastEvent>(sam, "chat");
      alex.send("chat", { text: "hi", sessionId: "forged", nickname: "Forged" });
      const received = await onSam;

      expect(received.sessionId).toBe(alex.sessionId);
      expect(received.nickname).toBe("Alex");

      await alex.leave();
      await sam.leave();
    });

    it("trims a message before broadcasting it", async () => {
      const room = await join("Alex");
      await waitFor(() => room.state.players?.get(room.sessionId) !== undefined);

      const onChat = onceMessage<ChatBroadcastEvent>(room, "chat");
      room.send("chat", { text: "  hi there  " });
      const received = await onChat;

      expect(received.text).toBe("hi there");

      await room.leave();
    });

    it("rejects an empty message instead of broadcasting it", async () => {
      const room = await join("Alex");
      await waitFor(() => room.state.players?.get(room.sessionId) !== undefined);

      const rejection = onceMessage<ChatRejection>(room, "chat_rejected");
      room.send("chat", { text: "   " });
      const result = await rejection;

      expect(result).toMatchObject({ reason: "invalid" });

      await room.leave();
    });

    it("rejects a message over the length limit instead of broadcasting it", async () => {
      const room = await join("Alex");
      await waitFor(() => room.state.players?.get(room.sessionId) !== undefined);

      const rejection = onceMessage<ChatRejection>(room, "chat_rejected");
      room.send("chat", { text: "a".repeat(201) });
      const result = await rejection;

      expect(result).toMatchObject({ reason: "invalid" });

      await room.leave();
    });

    it("rate limits a client sending messages faster than a person plausibly could", async () => {
      const room = await join("Alex");
      await waitFor(() => room.state.players?.get(room.sessionId) !== undefined);

      const broadcasts: ChatBroadcastEvent[] = [];
      const rejections: ChatRejection[] = [];
      room.onMessage("chat", (m: ChatBroadcastEvent) => broadcasts.push(m));
      room.onMessage("chat_rejected", (m: ChatRejection) => rejections.push(m));

      for (let i = 0; i < 8; i++) {
        room.send("chat", { text: `message ${i}` });
      }

      await waitFor(() => broadcasts.length + rejections.length >= 8);

      expect(broadcasts).toHaveLength(5);
      expect(rejections.filter((r) => r.reason === "rate_limited")).toHaveLength(3);

      await room.leave();
    });
  });

  describe("announcements", () => {
    /** A short poll interval so these tests don't have to wait out the real 4s production cadence. */
    const POLL_INTERVAL_MS = 100;

    async function withFastAnnouncements(
      run: (endpoint: string) => Promise<void>,
    ) {
      const fastServer = createGameServer({
        persistence,
        announcementPollIntervalMs: POLL_INTERVAL_MS,
      });
      await fastServer.gameServer.listen(0);
      const { port } = fastServer.httpServer.address() as AddressInfo;
      try {
        await run(`ws://localhost:${port}`);
      } finally {
        await fastServer.gameServer.gracefullyShutdown(false);
      }
    }

    it("delivers a pending announcement only to sessions in its class", async () => {
      await withFastAnnouncements(async (fastEndpoint) => {
        const inClass = await new Client(fastEndpoint).joinOrCreate<TownRoomState>("town", {
          ticket: ticketFor("Alex", CLASS_ID),
        });
        const otherClass = await new Client(fastEndpoint).joinOrCreate<TownRoomState>("town", {
          ticket: ticketFor("Sam", OTHER_CLASS_ID),
        });
        await waitFor(() => inClass.state.players?.get(inClass.sessionId) !== undefined);
        await waitFor(() => otherClass.state.players?.get(otherClass.sessionId) !== undefined);

        const otherClassReceived: AnnouncementEvent[] = [];
        otherClass.onMessage("announcement", (m: AnnouncementEvent) => otherClassReceived.push(m));
        const onInClass = onceMessage<AnnouncementEvent>(inClass, "announcement");

        persistence.queueAnnouncement(CLASS_ID, "쉬는 시간입니다!");
        const received = await onInClass;

        expect(received.message).toBe("쉬는 시간입니다!");
        // Gives a second poll cycle a chance to have run, so this isn't just
        // "no message arrived yet" -- the other class's own poll definitely
        // executed and still found nothing for it.
        await sleep(POLL_INTERVAL_MS * 3);
        expect(otherClassReceived).toHaveLength(0);

        await inClass.leave();
        await otherClass.leave();
      });
    }, 10000);

    it("marks a delivered announcement so it is never sent twice", async () => {
      await withFastAnnouncements(async (fastEndpoint) => {
        const room = await new Client(fastEndpoint).joinOrCreate<TownRoomState>("town", {
          ticket: ticketFor("Alex", CLASS_ID),
        });
        await waitFor(() => room.state.players?.get(room.sessionId) !== undefined);

        const received: AnnouncementEvent[] = [];
        room.onMessage("announcement", (m: AnnouncementEvent) => received.push(m));

        const id = persistence.queueAnnouncement(CLASS_ID, "집중해 주세요!");
        await waitFor(() => received.length >= 1);
        await waitFor(() => persistence.deliveredAnnouncementIds.includes(id));

        // A few more poll cycles pass with the row already marked delivered.
        await sleep(POLL_INTERVAL_MS * 5);
        expect(received).toHaveLength(1);

        await room.leave();
      });
    }, 10000);

    it("never queries for a class with no connected session", async () => {
      await withFastAnnouncements(async (fastEndpoint) => {
        const room = await new Client(fastEndpoint).joinOrCreate<TownRoomState>("town", {
          ticket: ticketFor("Alex", CLASS_ID),
        });
        await waitFor(() => room.state.players?.get(room.sessionId) !== undefined);

        persistence.queueAnnouncement(OTHER_CLASS_ID, "아무도 없는 학급");
        await sleep(POLL_INTERVAL_MS * 5);

        expect(persistence.deliveredAnnouncementIds).toHaveLength(0);

        await room.leave();
      });
    }, 10000);
  });
});
