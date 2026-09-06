// The web app's own health signal, read by the Admin System Health page and
// (once Phase 6 exists) the deployment pipeline's post-deploy health check.
// Kept dynamic so it always reflects the current request, not a build-time
// snapshot.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ status: "ok", timestamp: new Date().toISOString() });
}
