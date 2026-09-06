import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockSingle = vi.fn();
const mockEq = vi.fn(() => ({ single: mockSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(() => Promise.resolve({ from: mockFrom })),
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: vi.fn(() => ({ from: mockFrom })),
}));

import { getOpsConfig, getOpsConfigForScheduler } from "./opsConfig";

describe("getOpsConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps the row to camelCase", async () => {
    mockSingle.mockResolvedValue({
      data: { auto_update_enabled: true, auto_announcement_enabled: false, auto_rollback_enabled: true },
      error: null,
    });

    const config = await getOpsConfig();

    expect(config).toEqual({
      autoUpdateEnabled: true,
      autoAnnouncementEnabled: false,
      autoRollbackEnabled: true,
    });
  });

  it("defaults every flag to false instead of throwing on a query error", async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: "boom" } });
    const config = await getOpsConfig();
    expect(config).toEqual({
      autoUpdateEnabled: false,
      autoAnnouncementEnabled: false,
      autoRollbackEnabled: false,
    });
  });
});

describe("getOpsConfigForScheduler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null (not a default-false object) on a query error, so callers can fail closed explicitly", async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: "boom" } });
    const config = await getOpsConfigForScheduler();
    expect(config).toBeNull();
  });
});
