import http from "node:http";
import express from "express";
import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { TownRoom } from "./rooms/TownRoom.js";

/**
 * Builds the game server without starting it, so tests can bind it to an
 * ephemeral port instead of the real one `index.ts` listens on.
 */
export function createGameServer() {
  const app = express();

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  const httpServer = http.createServer(app);

  const gameServer = new Server({
    transport: new WebSocketTransport({ server: httpServer }),
  });

  gameServer.define("town", TownRoom);

  return { app, httpServer, gameServer };
}
