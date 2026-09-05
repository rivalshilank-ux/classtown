import { createGameServer } from "./server.js";
import { createSupabasePersistence } from "./persistence/supabasePersistence.js";

// Fail fast: a game server that cannot reach Supabase cannot verify a join
// ticket, and a room that cannot verify tickets must not accept players.
const persistence = createSupabasePersistence();

const { gameServer } = createGameServer({ persistence });

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
