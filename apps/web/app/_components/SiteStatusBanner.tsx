import { Alert } from "@classtown/ui";
import { getActiveMaintenanceNotice } from "@/lib/site/maintenance";
import { getLatestPublishedAnnouncement } from "@/lib/site/announcements";

/**
 * Site-wide notice banner: the currently active maintenance window (if any)
 * and the latest published, unexpired announcement (if any). Included on the
 * landing, teacher, and student entry pages -- not inside /admin, where the
 * dedicated System Health / Announcements pages already show this and more.
 * Renders nothing when there is nothing to show, rather than an empty shell.
 */
export async function SiteStatusBanner() {
  const [maintenance, announcement] = await Promise.all([
    getActiveMaintenanceNotice(),
    getLatestPublishedAnnouncement(),
  ]);

  if (!maintenance && !announcement) {
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-4 pt-4">
      {maintenance && (
        <Alert variant="warning">
          <span className="font-[family-name:var(--font-display)] text-base">서비스 점검 안내</span>
          <br />
          {maintenance.message}
        </Alert>
      )}
      {announcement && (
        <Alert variant="info">
          <span className="font-[family-name:var(--font-display)] text-base">
            {announcement.title}
          </span>
          <br />
          {announcement.body}
        </Alert>
      )}
    </div>
  );
}
