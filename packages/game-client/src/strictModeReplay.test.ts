import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createGameServer } from "@classtown/game-server/server";
import {
  createFakePersistence,
  type FakePersistence,
} from "@classtown/game-server/fakePersistence";
import { connectToTownRoom } from "./connection";
import { deferCancelable } from "./deferredConnect";

const CLASS_ID = "11111111-1111-4111-8111-111111111111";

/**
 * Reproduces, against a real room (not a mock), what React StrictMode does to
 * an effect in development: run it, clean it up immediately, then run it
 * again -- synchronously, before any microtask fires. `createGameClient`
 * wraps `connectToTownRoom` in `deferCancelable` for exactly this reason; this
 * test exercises that pairing the same way GameCanvas does, rather than
 * testing `deferCancelable` in isolation.
 */
describe("connectToTownRoom behind deferCancelable under a StrictMode-style replay", () => {
  let server: ReturnType<typeof createGameServer>;
  let persistence: FakePersistence;
  let endpoint: string;

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

  it("spends the ticket exactly once and only the surviving (second) mount joins", async () => {
    const ticket = persistence.issueTicket({
      participantId: "22222222-2222-4222-8222-000000000001",
      classId: CLASS_ID,
      nickname: "Alex",
    });

    const firstRoomPromise: Array<Promise<unknown>> = [];
    const first = deferCancelable(() => {
      firstRoomPromise.push(connectToTownRoom(endpoint, { ticket }));
    });
    first.cancel(); // StrictMode's synchronous cleanup of the discarded mount

    let secondRoom: Awaited<ReturnType<typeof connectToTownRoom>> | undefined;
    let secondError: unknown;
    const second = deferCancelable(() => {
      connectToTownRoom(endpoint, { ticket })
        .then((room) => {
          secondRoom = room;
        })
        .catch((error: unknown) => {
          secondError = error;
        });
    });
    void second;

    // Let the deferred microtasks (and the join round-trip) settle.
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(firstRoomPromise).toHaveLength(0); // the cancelled first mount never ran at all
    expect(secondError).toBeUndefined();
    expect(secondRoom).toBeDefined();

    await secondRoom?.leave();
  });
});
