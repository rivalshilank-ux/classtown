import Phaser from "phaser";
import type { Room } from "colyseus.js";
import type { ChatBroadcastEvent, ChatRejection, TownRoomState } from "@classtown/shared-schema";
import { sendChatMessage } from "./chatSender";
import { connectToTownRoom, reconnectToTownRoom } from "./connection";
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
  let currentRoom: Room<TownRoomState> | undefined;
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

  function bindScene(room: Room<TownRoomState>) {
    currentRoom = room;
    keyboard ??= new KeyboardInput(window);

    room.onMessage("chat", (message: ChatBroadcastEvent) => {
      if (!destroyed) {
        options.onChatMessage?.(message);
      }
    });
    room.onMessage("chat_rejected", (message: ChatRejection) => {
      if (!destroyed) {
        options.onChatRejected?.(message);
      }
    });

    if (!game) {
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
    }

    // Restarting an already-added scene re-runs create() against the new
    // room's state, which is what re-attaches every $(room.state) listener
    // TownScene sets up -- the same call the very first connection uses.
    game.scene.start("town", { room, keyboard });
  }

  /**
   * A dropped connection and a deliberate leave both land here; the server
   * already decided which one this was (TownRoom.onLeave's `consented`
   * check opens a reconnection window only for the former), so this always
   * tries exactly once and simply falls through to "disconnected" if the
   * server never opened a window -- no close-code inspection needed here.
   */
  function handleDrop(room: Room<TownRoomState>) {
    if (destroyed || currentRoom !== room) {
      return;
    }

    reportStatus("reconnecting");
    reconnectToTownRoom(options.endpoint, room.reconnectionToken)
      .then((nextRoom) => {
        if (destroyed) {
          void nextRoom.leave();
          return;
        }
        wireLeave(nextRoom);
        bindScene(nextRoom);
        reportStatus("joined");
      })
      .catch(() => {
        reportStatus("disconnected");
      });
  }

  function wireLeave(room: Room<TownRoomState>) {
    room.onLeave(() => handleDrop(room));
  }

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

        wireLeave(room);
        bindScene(room);
        reportStatus("joined");
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
      // An explicit, consented leave -- without this, TownRoom.onLeave sees
      // an unconsented drop for every ordinary "student closed the tab" and
      // holds the seat open for the reconnection grace window for nothing.
      void currentRoom?.leave();
    },
    sendChat(text: string) {
      if (destroyed || !currentRoom) {
        return;
      }
      try {
        sendChatMessage(currentRoom, { text });
      } catch {
        // Empty/over-length text never reaches the server; the chat UI is
        // expected to already prevent submitting either, same as
        // sendMoveIntent's validation guards a forged/out-of-range intent.
      }
    },
  };
}
