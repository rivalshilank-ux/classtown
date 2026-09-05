import Phaser from "phaser";
import { connectToTownRoom } from "./connection";
import { deferCancelable } from "./deferredConnect";
import { KeyboardInput } from "./KeyboardInput";
import { TownScene } from "./scenes/TownScene";
import type { ConnectionStatus, GameClientHandle, GameClientOptions } from "./types";

export function createGameClient(
  container: HTMLElement,
  options: GameClientOptions,
): GameClientHandle {
  let game: Phaser.Game | undefined;
  let keyboard: KeyboardInput | undefined;
  let destroyed = false;

  const reportStatus = (status: ConnectionStatus) => {
    if (!destroyed) {
      options.onStatusChange?.(status);
    }
  };
  const reportError = (message: string) => {
    if (!destroyed) {
      options.onError?.(message);
    }
  };

  // The join options carry a single-use ticket, so the actual connection
  // attempt is deferred by a microtask (see deferCancelable) rather than
  // fired here directly. Otherwise, React StrictMode's development-only
  // mount -> cleanup -> mount replay would send two join requests for the
  // same ticket, and the discarded first one can win the race and consume
  // it -- leaving the surviving second mount rejected with "Invalid or
  // expired join ticket". Cancelling on destroy() means the discarded
  // attempt never sends anything in the first place.
  const connectTask = deferCancelable(() => {
    connectToTownRoom(options.endpoint, options.joinOptions, reportStatus)
      .then((room) => {
        if (destroyed) {
          void room.leave();
          return;
        }

        keyboard = new KeyboardInput(window);

        game = new Phaser.Game({
          type: Phaser.AUTO,
          parent: container,
          backgroundColor: "#5c9c43",
          scale: {
            mode: Phaser.Scale.RESIZE,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            width: container.clientWidth || 800,
            height: container.clientHeight || 600,
          },
        });

        game.scene.add("town", TownScene);
        game.scene.start("town", { room, keyboard });
      })
      .catch((error: unknown) => {
        reportStatus("error");
        reportError(
          error instanceof Error ? error.message : "Failed to connect to game server",
        );
      });
  });

  return {
    destroy() {
      destroyed = true;
      connectTask.cancel();
      keyboard?.destroy();
      game?.destroy(true);
    },
  };
}
