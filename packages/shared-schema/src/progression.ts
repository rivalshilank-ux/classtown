/**
 * The one place XP and level are derived from play time. Both are pure
 * functions of `student_progression.play_seconds` — never incrementally
 * added and stored separately — so there is nothing to drift out of sync
 * and no history of past formula versions to migrate: recomputing from the
 * same cumulative input always gives the same answer.
 *
 * Deliberately simple by design (see docs/game/game-design.md and every
 * prior phase's instruction not to build a progression system beyond a
 * placeholder until there's a real reason to): one flat rate, one flat
 * level threshold, no curve, no cap, no bonus sources. XP is earned only
 * from time actually spent connected to a room (`addPlaySeconds`, called
 * from `TownRoom.onLeave`) — never from a client-reachable action, so it
 * cannot be earned faster by claiming more play time than actually happened.
 */

/** 6 XP/minute -- a full 40-minute class period earns roughly 240 XP. */
export const SECONDS_PER_XP = 10;

/** Flat threshold. Level 1 is 0-99 XP, level 2 is 100-199 XP, and so on. */
export const XP_PER_LEVEL = 100;

export function xpForPlaySeconds(totalPlaySeconds: number): number {
  return Math.floor(Math.max(0, totalPlaySeconds) / SECONDS_PER_XP);
}

export function levelForXp(xp: number): number {
  return Math.floor(Math.max(0, xp) / XP_PER_LEVEL) + 1;
}

export interface Progression {
  xp: number;
  level: number;
}

/** What a given cumulative play time is worth, computed fresh every time. */
export function progressionForPlaySeconds(totalPlaySeconds: number): Progression {
  const xp = xpForPlaySeconds(totalPlaySeconds);
  return { xp, level: levelForXp(xp) };
}
