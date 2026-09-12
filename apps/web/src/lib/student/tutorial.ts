/**
 * Whether this browser tab has already dismissed the how-to-play overlay
 * this session. Deliberately not persisted anywhere durable -- per
 * docs/game/tutorial.md's Security section, onboarding UI implies no
 * server-side state, so a fresh tab (or a new class period) simply shows it
 * again. The Help button in GameCanvas re-opens the same overlay on demand
 * regardless of this flag -- see docs/game/tutorial.md's "Tutorial replay".
 */
const STORAGE_KEY = "classtown.tutorialSeen";

export function hasSeenTutorial(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markTutorialSeen(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // sessionStorage can be unavailable (private mode, storage disabled).
    // Worst case the overlay just reappears next time -- no correctness issue.
  }
}
