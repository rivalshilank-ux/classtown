"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AdminShortcutDetector } from "./adminShortcutDetector";

function isEditableElement(el: Element | null): boolean {
  if (!el) {
    return false;
  }
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || (el as HTMLElement).isContentEditable;
}

/** Global, invisible: double-tap Shift+Cmd (Mac) or Shift+Ctrl (Windows/Linux) anywhere on the site to reach /admin/login. Grants no authority by itself -- see docs/adr/0006-hidden-admin-entry.md. */
export function useAdminShortcut() {
  const router = useRouter();
  const detectorRef = useRef<AdminShortcutDetector | null>(null);
  detectorRef.current ??= new AdminShortcutDetector();

  useEffect(() => {
    const detector = detectorRef.current!;

    function handleKeyDown(event: KeyboardEvent) {
      const fired = detector.handleKeyDown({
        key: event.key,
        isEditableTarget: isEditableElement(document.activeElement),
      });
      if (fired) {
        router.push("/admin/login");
      }
    }

    function handleKeyUp(event: KeyboardEvent) {
      detector.handleKeyUp(event.key);
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [router]);
}
