import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getStateCallbacks } from "colyseus.js";
import { SPAWN_POINT } from "@classtown/shared-schema";
import { createGameServer } from "@classtown/game-server/server";
import {
  createFakePersistence,
  type FakePersistence,
} from "@classtown/game-server/fakePersistence";
import { connectToTownRoom } from "./connection";
import { sendMoveIntent } from "./moveSender";
import type { ConnectionStatus, MoveIntentInput } from "./types";

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

describe("game-client connection integration", () => {
  let server: ReturnType<typeof createGameServer>;
  let persistence: FakePersistence;
  let endpoint: string;
  let seq = 0;

  /** Mints the ticket the web join action would hand the browser. */
  function ticket() {
    seq += 1;
    return {
      ticket: persistence.issueTicket({
        participantId: `22222222-2222-4222-8222-${String(seq).padStart(12, "0")}`,
        classId: CLASS_ID,
        nickname: "Alex",
      }),
    };
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

  it("connects, joins town, sends a move intent, and receives the server-computed position", async () => {
    const statuses: ConnectionStatus[] = [];
    const room = await connectToTownRoom(endpoint, ticket(), (status) => {
      statuses.push(status);
    });

    expect(statuses).toEqual(["connecting", "joining", "joined"]);

    const $ = getStateCallbacks(room);
    let observedX: number | undefined;
    $(room.state).players.onAdd((player, sessionId) => {
      if (sessionId === room.sessionId) {
        $(player).listen("x", (value) => {
          observedX = value;
        });
      }
    }, true);

    sendMoveIntent(room, { dx: 1, dy: 0 });

    await waitFor(() => observedX !== undefined && observedX > SPAWN_POINT.x);
    expect(observedX).toBeGreaterThan(SPAWN_POINT.x);

    await room.leave();
    await waitFor(() => statuses.includes("disconnected"));
    expect(statuses).toEqual(["connecting", "joining", "joined", "disconnected"]);
  });

  it("refuses to send a malformed payload (e.g. an absolute position) to the server", async () => {
    const room = await connectToTownRoom(endpoint, ticket());

    expect(() =>
      sendMoveIntent(room, { x: 999, y: 999 } as unknown as MoveIntentInput),
    ).toThrow();

    await room.leave();
  });
});
