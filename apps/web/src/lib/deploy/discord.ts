import "server-only";

export type DiscordReportResult =
  | { sent: true }
  | { sent: false; reason: string };

/**
 * Same "not configured" posture as GITHUB_TOKEN/VERCEL_TOKEN
 * (apps/web/src/lib/ai/github.ts, apps/web/src/lib/deploy/vercel.ts): a
 * missing env var degrades honestly instead of throwing, and nothing in
 * this project's own deployment sets DISCORD_WEBHOOK_URL today -- see
 * docs/operations/operations.md.
 */
export async function postDiscordReport(message: string): Promise<DiscordReportResult> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    return { sent: false, reason: "DISCORD_WEBHOOK_URL이 설정되어 있지 않습니다." };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: message }),
      cache: "no-store",
    });

    if (!response.ok) {
      return { sent: false, reason: `Discord webhook 오류 (${response.status})` };
    }

    return { sent: true };
  } catch (error) {
    return {
      sent: false,
      reason: error instanceof Error ? error.message : "Discord webhook 호출 실패",
    };
  }
}
