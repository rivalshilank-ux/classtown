import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export interface OpsConfig {
  autoUpdateEnabled: boolean;
  autoAnnouncementEnabled: boolean;
  autoRollbackEnabled: boolean;
  autoHealthReportEnabled: boolean;
}

const DEFAULT_CONFIG: OpsConfig = {
  autoUpdateEnabled: false,
  autoAnnouncementEnabled: false,
  autoRollbackEnabled: false,
  autoHealthReportEnabled: false,
};

const OPS_CONFIG_COLUMNS =
  "auto_update_enabled, auto_announcement_enabled, auto_rollback_enabled, auto_health_report_enabled";

export async function getOpsConfig(): Promise<OpsConfig> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ops_config")
    .select(OPS_CONFIG_COLUMNS)
    .eq("singleton", true)
    .single();

  if (error || !data) {
    return DEFAULT_CONFIG;
  }

  return {
    autoUpdateEnabled: data.auto_update_enabled,
    autoAnnouncementEnabled: data.auto_announcement_enabled,
    autoRollbackEnabled: data.auto_rollback_enabled,
    autoHealthReportEnabled: data.auto_health_report_enabled,
  };
}

/** Used only by the scheduler (service role, no admin session in a cron context). */
export async function getOpsConfigForScheduler(): Promise<OpsConfig | null> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("ops_config")
    .select(OPS_CONFIG_COLUMNS)
    .eq("singleton", true)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    autoUpdateEnabled: data.auto_update_enabled,
    autoAnnouncementEnabled: data.auto_announcement_enabled,
    autoRollbackEnabled: data.auto_rollback_enabled,
    autoHealthReportEnabled: data.auto_health_report_enabled,
  };
}
