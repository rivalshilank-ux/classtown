import "server-only";

const REPO = "rivalshilank-ux/classtown";

export interface RecentCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
}

export type GitChangesResult =
  | { available: true; commits: RecentCommit[] }
  | { available: false; reason: string };

/**
 * Reads recent commits on the default branch via GitHub's REST API --
 * no GitHub Actions/CI setup needed (that's Phase 5's concern), just a
 * read-only call that degrades honestly without a token rather than
 * failing the whole AI Ops request.
 */
export async function getRecentCommits(limit = 10): Promise<GitChangesResult> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return { available: false, reason: "GITHUB_TOKEN이 설정되어 있지 않습니다." };
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${REPO}/commits?per_page=${limit}`,
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

    const data = (await response.json()) as Array<{
      sha: string;
      commit: { message: string; author: { name: string; date: string } };
    }>;

    return {
      available: true,
      commits: data.map((row) => ({
        sha: row.sha.slice(0, 7),
        message: row.commit.message.split("\n")[0] ?? "",
        author: row.commit.author.name,
        date: row.commit.author.date,
      })),
    };
  } catch (error) {
    return {
      available: false,
      reason: error instanceof Error ? error.message : "GitHub API 호출 실패",
    };
  }
}
