import Phaser from "phaser";
import { connectToTownRoom } from "./connection";
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
        backgroundColor: "#0f172a",
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

  return {
    destroy() {
      destroyed = true;
      keyboard?.destroy();
      game?.destroy(true);
    },
  };
}
