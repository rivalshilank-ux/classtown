import "server-only";

const REPO = "rivalshilank-ux/classtown";
// The repo's actual default branch is "master" (confirmed via `gh repo view`
// during Phase 8's release-pipeline audit) -- ci.yml also runs on push to
// this branch, not "main". A mismatch here means this always reports "no
// completed workflow runs," never a real green/red status.
const DEFAULT_BRANCH = "master";

export type WorkflowConclusionResult =
  | { available: true; conclusion: string; headSha: string }
  | { available: false; reason: string };

/**
 * "Is main's HEAD currently green" via the real GitHub Actions API --
 * checks the most recent *completed* run for the default branch, rather
 * than triggering a new one and waiting. Triggering ci.yml on every push is
 * what actually keeps this answer current; this just reads it.
 */
export async function getWorkflowConclusion(): Promise<WorkflowConclusionResult> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return { available: false, reason: "GITHUB_TOKEN이 설정되어 있지 않습니다." };
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${REPO}/actions/runs?branch=${DEFAULT_BRANCH}&status=completed&per_page=1`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return { available: false, reason: `GitHub API 오류 (${response.status})` };
    }

    const data = (await response.json()) as {
      workflow_runs: Array<{ conclusion: string | null; head_sha: string }>;
    };

    const latest = data.workflow_runs[0];
    if (!latest || !latest.conclusion) {
      return { available: false, reason: "완료된 워크플로우 실행이 없습니다." };
    }

    return { available: true, conclusion: latest.conclusion, headSha: latest.head_sha };
  } catch (error) {
    return {
      available: false,
      reason: error instanceof Error ? error.message : "GitHub API 호출 실패",
    };
  }
}
