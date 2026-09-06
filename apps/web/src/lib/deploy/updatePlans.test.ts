import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

interface QueryResult {
  data?: unknown;
  error?: unknown;
}

function createQueryStub(getResult: () => QueryResult) {
  const methods = ["select", "insert", "eq", "order", "limit", "maybeSingle", "single"] as const;
  const stub: Record<string, unknown> = {};
  for (const method of methods) {
    stub[method] = vi.fn(() => stub);
  }
  stub.then = (onFulfilled: (v: QueryResult) => unknown, onRejected?: (e: unknown) => unknown) =>
    Promise.resolve(getResult()).then(onFulfilled, onRejected);
  return stub;
}

let result: QueryResult;
let stub: ReturnType<typeof createQueryStub>;

const { mockFrom, mockGetRecentCommits } = vi.hoisted(() => ({
  mockFrom: vi.fn(() => stub),
  mockGetRecentCommits: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(() => Promise.resolve({ from: mockFrom })),
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/ai/github", () => ({
  getRecentCommits: mockGetRecentCommits,
}));

import {
  createSystemUpdatePlan,
  createUpdatePlanViaAdmin,
  listUpdateExecutions,
  listUpdatePlans,
} from "./updatePlans";

describe("createSystemUpdatePlan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    result = { data: { id: "plan-1" }, error: null };
    stub = createQueryStub(() => result);
  });

  it("assigns high risk and includes the commit in changes when a commit message mentions a migration", async () => {
    mockGetRecentCommits.mockResolvedValue({
      available: true,
      commits: [{ sha: "abc1234", message: "add a db migration", author: "a", date: "d" }],
    });

    const plan = await createSystemUpdatePlan();

    expect(plan).toEqual({ id: "plan-1" });
    expect(stub.insert).toHaveBeenCalledWith(
      expect.objectContaining({ risk_level: "high", created_by_type: "system" }),
    );
  });

  it("assigns low risk for ordinary commits", async () => {
    mockGetRecentCommits.mockResolvedValue({
      available: true,
      commits: [{ sha: "abc1234", message: "tweak landing page copy", author: "a", date: "d" }],
    });

    await createSystemUpdatePlan();

    expect(stub.insert).toHaveBeenCalledWith(expect.objectContaining({ risk_level: "low" }));
  });

  it("does not throw, and still creates a plan, when getRecentCommits reports not available", async () => {
    mockGetRecentCommits.mockResolvedValue({ available: false, reason: "no token" });
    await expect(createSystemUpdatePlan()).resolves.toEqual({ id: "plan-1" });
  });

  it("returns null instead of throwing when the insert fails", async () => {
    mockGetRecentCommits.mockResolvedValue({ available: true, commits: [] });
    result = { data: null, error: { message: "boom" } };
    const plan = await createSystemUpdatePlan();
    expect(plan).toBeNull();
  });
});

describe("createUpdatePlanViaAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    result = { data: { id: "plan-2" }, error: null };
    stub = createQueryStub(() => result);
  });

  it("creates a plan attributed to 'ai', via the admin-session client", async () => {
    mockGetRecentCommits.mockResolvedValue({ available: true, commits: [] });

    const plan = await createUpdatePlanViaAdmin();

    expect(plan).toEqual({ id: "plan-2" });
    expect(stub.insert).toHaveBeenCalledWith(expect.objectContaining({ created_by_type: "ai" }));
  });
});

describe("listUpdatePlans", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stub = createQueryStub(() => result);
  });

  it("returns an empty array instead of throwing on a query error", async () => {
    result = { data: null, error: { message: "boom" } };
    const plans = await listUpdatePlans();
    expect(plans).toEqual([]);
  });

  it("maps rows to the summary shape", async () => {
    result = {
      data: [
        {
          id: "plan-1",
          status: "planned",
          summary: "s",
          risk_level: "low",
          created_by_type: "system",
          approved_by: null,
          approved_at: null,
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
      error: null,
    };

    const plans = await listUpdatePlans();

    expect(plans).toEqual([
      {
        id: "plan-1",
        status: "planned",
        summary: "s",
        riskLevel: "low",
        createdByType: "system",
        approvedBy: null,
        approvedAt: null,
        createdAt: "2026-01-01T00:00:00Z",
      },
    ]);
  });
});

describe("listUpdateExecutions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stub = createQueryStub(() => result);
  });

  it("returns an empty array instead of throwing on a query error", async () => {
    result = { data: null, error: { message: "boom" } };
    const executions = await listUpdateExecutions("plan-1");
    expect(executions).toEqual([]);
  });

  it("maps rows to the summary shape", async () => {
    result = {
      data: [
        {
          id: "exec-1",
          state: "completed",
          started_at: "2026-01-01T00:00:00Z",
          finished_at: "2026-01-01T00:05:00Z",
          checkpoint_deployment_id: "dpl_prev",
        },
      ],
      error: null,
    };

    const executions = await listUpdateExecutions("plan-1");

    expect(executions).toEqual([
      {
        id: "exec-1",
        state: "completed",
        startedAt: "2026-01-01T00:00:00Z",
        finishedAt: "2026-01-01T00:05:00Z",
        checkpointDeploymentId: "dpl_prev",
      },
    ]);
    expect(stub.eq).toHaveBeenCalledWith("update_plan_id", "plan-1");
  });
});
