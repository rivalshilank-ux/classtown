import { createGameServer } from "./server.js";

const { gameServer } = createGameServer();

const port = Number(process.env.PORT) || 2567;

gameServer
  .listen(port)
  .then(() => {
    console.log(`ClassTown game-server listening on ws://localhost:${port}`);
  })
  .catch((err: unknown) => {
    console.error("Failed to start game-server:", err);
    process.exit(1);
  });
