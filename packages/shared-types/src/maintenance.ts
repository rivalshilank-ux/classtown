/**
 * The one machine-readable code used by both apps/web (server actions) and
 * apps/game-server (Colyseus onAuth) when a maintenance window blocks an
 * action. Each caller maps it to its own human-facing message -- this stays
 * a plain string constant, not a localized message, so it works the same
 * way in a Colyseus ServerError as in a server action's return value.
 */
export const MAINTENANCE_MODE_ERROR_CODE = "MAINTENANCE_MODE" as const;
