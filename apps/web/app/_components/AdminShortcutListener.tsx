"use client";

import { useAdminShortcut } from "@/hooks/useAdminShortcut";

/** No UI by design -- see docs/adr/0006-hidden-admin-entry.md. */
export function AdminShortcutListener() {
  useAdminShortcut();
  return null;
}
