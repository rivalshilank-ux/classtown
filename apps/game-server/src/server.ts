import http from "node:http";
import express from "express";
import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { TownRoom } from "./rooms/TownRoom.js";
import type { ClassPersistence } from "./persistence/types.js";

export interface GameServerOptions {
  persistence: ClassPersistence;
}

export function createGameServer({ persistence }: GameServerOptions) {
  const app = express();

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  const httpServer = http.createServer(app);

  const gameServer = new Server({
    transport: new WebSocketTransport({ server: httpServer }),
  });

  // Persistence is injected rather than imported so the room has no hard
  // dependency on a live database, and tests can drive the join flow with a
  // fake instead of a real Supabase project.
  gameServer.define("town", TownRoom, { persistence });

  return { app, httpServer, gameServer };
}
