import "server-only";

export type DeployResult = { ok: true; message?: string } | { ok: false; message: string };

function vercelTeamQuery(): string {
  const teamId = process.env.VERCEL_TEAM_ID;
  return teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
}

function vercelHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

/**
 * A deploy never means `git push` in this project (see docs/adr/0007) --
 * this POSTs to a Vercel Deploy Hook, a real Vercel feature that rebuilds
 * and redeploys whatever is already on the connected branch. No token
 * needed; the hook URL itself is the credential.
 */
export async function triggerDeployHook(): Promise<DeployResult> {
  const hookUrl = process.env.VERCEL_DEPLOY_HOOK_URL;
  if (!hookUrl) {
    return { ok: false, message: "VERCEL_DEPLOY_HOOK_URL이 설정되어 있지 않습니다." };
  }

  try {
    const response = await fetch(hookUrl, { method: "POST", cache: "no-store" });
    if (!response.ok) {
      return { ok: false, message: `Deploy Hook 호출 실패 (${response.status})` };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Deploy Hook 호출 실패" };
  }
}

export interface DeploymentStatus {
  id: string;
  readyState: string;
  url: string;
}

export type DeploymentStatusResult =
  | { available: true; deployment: DeploymentStatus }
  | { available: false; reason: string };

/** The real Vercel REST API for a single deployment's build/ready state. */
export async function getDeploymentStatus(deploymentId: string): Promise<DeploymentStatusResult> {
  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    return { available: false, reason: "VERCEL_TOKEN이 설정되어 있지 않습니다." };
  }

  try {
    const response = await fetch(
      `https://api.vercel.com/v13/deployments/${deploymentId}${vercelTeamQuery()}`,
      { headers: vercelHeaders(token), cache: "no-store" },
    );
    if (!response.ok) {
      return { available: false, reason: `Vercel API 오류 (${response.status})` };
    }
    const data = (await response.json()) as { uid: string; readyState: string; url: string };
    return { available: true, deployment: { id: data.uid, readyState: data.readyState, url: data.url } };
  } catch (error) {
    return { available: false, reason: error instanceof Error ? error.message : "Vercel API 호출 실패" };
  }
}

export type LatestProductionDeploymentResult =
  | { available: true; deployment: DeploymentStatus }
  | { available: false; reason: string };

/** Used to record a pre-update checkpoint, and to find what to roll back to. */
export async function getLatestProductionDeployment(): Promise<LatestProductionDeploymentResult> {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) {
    return { available: false, reason: "VERCEL_TOKEN 또는 VERCEL_PROJECT_ID가 설정되어 있지 않습니다." };
  }

  try {
    const response = await fetch(
      `https://api.vercel.com/v6/deployments?projectId=${encodeURIComponent(projectId)}&target=production&limit=1${vercelTeamQuery().replace("?", "&")}`,
      { headers: vercelHeaders(token), cache: "no-store" },
    );
    if (!response.ok) {
      return { available: false, reason: `Vercel API 오류 (${response.status})` };
    }
    const data = (await response.json()) as {
      deployments: Array<{ uid: string; readyState: string; url: string }>;
    };
    const latest = data.deployments[0];
    if (!latest) {
      return { available: false, reason: "프로덕션 배포 기록이 없습니다." };
    }
    return { available: true, deployment: { id: latest.uid, readyState: latest.readyState, url: latest.url } };
  } catch (error) {
    return { available: false, reason: error instanceof Error ? error.message : "Vercel API 호출 실패" };
  }
}

/** The deployment one step before the current production one -- what an on-demand rollback (outside a pipeline run's own recorded checkpoint) would promote. */
export async function getPreviousProductionDeployment(): Promise<LatestProductionDeploymentResult> {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) {
    return { available: false, reason: "VERCEL_TOKEN 또는 VERCEL_PROJECT_ID가 설정되어 있지 않습니다." };
  }

  try {
    const response = await fetch(
      `https://api.vercel.com/v6/deployments?projectId=${encodeURIComponent(projectId)}&target=production&limit=2${vercelTeamQuery().replace("?", "&")}`,
      { headers: vercelHeaders(token), cache: "no-store" },
    );
    if (!response.ok) {
      return { available: false, reason: `Vercel API 오류 (${response.status})` };
    }
    const data = (await response.json()) as {
      deployments: Array<{ uid: string; readyState: string; url: string }>;
    };
    const previous = data.deployments[1];
    if (!previous) {
      return { available: false, reason: "롤백할 이전 프로덕션 배포가 없습니다." };
    }
    return { available: true, deployment: { id: previous.uid, readyState: previous.readyState, url: previous.url } };
  } catch (error) {
    return { available: false, reason: error instanceof Error ? error.message : "Vercel API 호출 실패" };
  }
}

/**
 * The actual rollback mechanism: Vercel's own deployment-promotion API,
 * pointed at a prior production deployment. Not an invented capability --
 * see docs/adr/0007-scheduler-and-deployment-pipeline.md.
 */
export async function promoteDeployment(deploymentId: string): Promise<DeployResult> {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) {
    return { ok: false, message: "VERCEL_TOKEN 또는 VERCEL_PROJECT_ID가 설정되어 있지 않습니다." };
  }

  try {
    const response = await fetch(
      `https://api.vercel.com/v10/projects/${encodeURIComponent(projectId)}/promote/${deploymentId}${vercelTeamQuery()}`,
      { method: "POST", headers: vercelHeaders(token), cache: "no-store" },
    );
    if (!response.ok) {
      return { ok: false, message: `Vercel 롤백 API 오류 (${response.status})` };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Vercel 롤백 API 호출 실패" };
  }
}
