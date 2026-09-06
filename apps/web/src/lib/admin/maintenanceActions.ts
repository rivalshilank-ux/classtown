"use server";

import {
  enableMaintenanceCore,
  disableMaintenanceCore,
  type AdminActionResult,
} from "@/lib/admin/maintenanceCore";

export type { AdminActionResult };

export async function enableMaintenance(input: unknown): Promise<AdminActionResult> {
  return enableMaintenanceCore(input, "admin");
}

export async function disableMaintenance(): Promise<AdminActionResult> {
  return disableMaintenanceCore("admin");
}
