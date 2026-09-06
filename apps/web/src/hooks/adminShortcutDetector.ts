/**
 * Pure, DOM-free detection logic for the hidden admin-login shortcut:
 * Shift+Command (Mac) or Shift+Ctrl (Windows/Linux), double-tapped within a
 * short window. Kept independent of `window`/`document` so it can be unit
 * tested without a DOM environment -- this repo has none configured today.
 *
 * Deliberately does not branch on OS: `navigator.platform`-style detection
 * is unreliable (the spec this was built against explicitly calls this out,
 * and `navigator.userAgentData` isn't available in Safari/Firefox anyway).
 * Instead both combos are recognized unconditionally -- a Mac keyboard
 * naturally produces "Meta", a Windows/Linux keyboard naturally produces
 * "Control", so each platform's users trigger only their own combo in
 * practice.
 */

const MODIFIER_KEYS = new Set(["Shift", "Meta", "Control"]);
const DOUBLE_TAP_WINDOW_MS = 1000;

export interface ShortcutKeyDownEvent {
  key: string;
  /** Whether the currently focused element is one a user could reasonably be typing into (input/textarea/contenteditable). */
  isEditableTarget: boolean;
}

export class AdminShortcutDetector {
  private readonly pressed = new Set<string>();
  private comboCount = 0;
  private lastComboAt = 0;
  private readonly now: () => number;

  constructor(now: () => number = Date.now) {
    this.now = now;
  }

  /** Returns true exactly when the second tap of the combo completes. */
  handleKeyDown(event: ShortcutKeyDownEvent): boolean {
    if (!MODIFIER_KEYS.has(event.key)) {
      // Any non-modifier key means this isn't a pure Shift+Meta/Shift+Control
      // press, no matter what else is held -- reset.
      this.pressed.clear();
      this.comboCount = 0;
      return false;
    }

    this.pressed.add(event.key);

    const hasShift = this.pressed.has("Shift");
    const hasMetaOrControl = this.pressed.has("Meta") || this.pressed.has("Control");
    // Exactly two keys held, and they're the right two -- not three
    // modifiers at once (e.g. Shift+Meta+Control), which is not the combo.
    const comboFired = this.pressed.size === 2 && hasShift && hasMetaOrControl;

    if (!comboFired || event.isEditableTarget) {
      // While typing, the shortcut is inert: neither fires nor advances the
      // double-tap counter. Key-press tracking itself is untouched so a
      // focus change mid-combo can't leave a phantom "stuck" modifier.
      return false;
    }

    const now = this.now();
    if (now - this.lastComboAt > DOUBLE_TAP_WINDOW_MS) {
      this.comboCount = 0;
    }
    this.comboCount += 1;
    this.lastComboAt = now;

    if (this.comboCount >= 2) {
      this.comboCount = 0;
      return true;
    }
    return false;
  }

  handleKeyUp(key: string): void {
    this.pressed.delete(key);
  }
}
