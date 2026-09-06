import { describe, expect, it } from "vitest";
import { AdminShortcutDetector } from "./adminShortcutDetector";

function down(detector: AdminShortcutDetector, key: string, isEditableTarget = false) {
  return detector.handleKeyDown({ key, isEditableTarget });
}

describe("AdminShortcutDetector", () => {
  it("does not fire on a single Shift+Meta tap", () => {
    const time = 0;
    const detector = new AdminShortcutDetector(() => time);

    expect(down(detector, "Shift")).toBe(false);
    expect(down(detector, "Meta")).toBe(false);
  });

  it("fires on the second Shift+Meta tap within the window", () => {
    let time = 0;
    const detector = new AdminShortcutDetector(() => time);

    down(detector, "Shift");
    down(detector, "Meta");
    detector.handleKeyUp("Meta");
    detector.handleKeyUp("Shift");

    time = 500;
    down(detector, "Shift");
    expect(down(detector, "Meta")).toBe(true);
  });

  it("fires on the second Shift+Control tap within the window (Windows/Linux)", () => {
    let time = 0;
    const detector = new AdminShortcutDetector(() => time);

    down(detector, "Control");
    down(detector, "Shift");
    detector.handleKeyUp("Shift");
    detector.handleKeyUp("Control");

    time = 500;
    down(detector, "Control");
    expect(down(detector, "Shift")).toBe(true);
  });

  it("does not fire when the second tap arrives after the window has elapsed", () => {
    let time = 0;
    const detector = new AdminShortcutDetector(() => time);

    down(detector, "Shift");
    down(detector, "Meta");
    detector.handleKeyUp("Meta");
    detector.handleKeyUp("Shift");

    time = 1500; // beyond the 1000ms window
    down(detector, "Shift");
    expect(down(detector, "Meta")).toBe(false);
  });

  it("resets on a wrong key in between (e.g. Shift+Meta+A)", () => {
    let time = 0;
    const detector = new AdminShortcutDetector(() => time);

    down(detector, "Shift");
    down(detector, "Meta");
    down(detector, "a"); // a real keypress while holding the combo -- not the shortcut
    detector.handleKeyUp("a");
    detector.handleKeyUp("Meta");
    detector.handleKeyUp("Shift");

    time = 100;
    down(detector, "Shift");
    expect(down(detector, "Meta")).toBe(false); // this is only the first clean tap now
  });

  it("does not fire when all three modifiers are held at once", () => {
    const time = 0;
    const detector = new AdminShortcutDetector(() => time);

    down(detector, "Shift");
    down(detector, "Meta");
    expect(down(detector, "Control")).toBe(false);
  });

  it("does not fire, and does not advance the counter, while focus is in an editable element", () => {
    let time = 0;
    const detector = new AdminShortcutDetector(() => time);

    down(detector, "Shift", true);
    expect(down(detector, "Meta", true)).toBe(false);
    detector.handleKeyUp("Meta");
    detector.handleKeyUp("Shift");

    // A subsequent clean (non-editable) attempt should still be "first tap",
    // proving the editable attempt above never counted.
    time = 100;
    down(detector, "Shift");
    expect(down(detector, "Meta")).toBe(false);
  });

  it("does not fire on Shift alone, or Meta alone, repeated", () => {
    let time = 0;
    const detector = new AdminShortcutDetector(() => time);

    expect(down(detector, "Shift")).toBe(false);
    detector.handleKeyUp("Shift");
    time = 100;
    expect(down(detector, "Shift")).toBe(false);
  });

  it("requires two full completions, not just holding both keys longer", () => {
    let time = 0;
    const detector = new AdminShortcutDetector(() => time);

    down(detector, "Shift");
    expect(down(detector, "Meta")).toBe(false); // first completion
    // Re-pressing Meta while both are already down does not happen in real
    // browsers (no repeat for modifier keys) -- but a real second attempt
    // requires releasing and re-forming the pair.
    detector.handleKeyUp("Meta");
    detector.handleKeyUp("Shift");

    time = 200;
    down(detector, "Shift");
    expect(down(detector, "Meta")).toBe(true);
  });
});
