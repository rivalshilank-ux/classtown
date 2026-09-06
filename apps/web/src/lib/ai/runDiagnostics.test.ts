import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockGetCurrentAdmin,
  mockIsAiConfigured,
  mockGetGroqClient,
  mockGetAiModel,
  mockCreate,
  mockGetTool,
  mockIsAutoExecuted,
  mockInsert,
  mockSingle,
  mockFrom,
} = vi.hoisted(() => {
  const mockCreate = vi.fn();
  const mockSingle = vi.fn();
  const mockSelect = vi.fn(() => ({ single: mockSingle }));
  const mockInsert = vi.fn(() => ({ select: mockSelect }));
  return {
    mockGetCurrentAdmin: vi.fn(),
    mockIsAiConfigured: vi.fn(),
    mockGetGroqClient: vi.fn(() => ({ chat: { completions: { create: mockCreate } } })),
    mockGetAiModel: vi.fn(() => "test-model"),
    mockCreate,
    mockGetTool: vi.fn(),
    mockIsAutoExecuted: vi.fn(),
    mockInsert,
    mockSingle,
    mockFrom: vi.fn(() => ({ insert: mockInsert })),
  };
});

vi.mock("@/lib/auth/getCurrentAdmin", () => ({
  getCurrentAdmin: mockGetCurrentAdmin,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(() => Promise.resolve({ from: mockFrom })),
}));

vi.mock("@/lib/ai/groqClient", () => ({
  isAiConfigured: mockIsAiConfigured,
  getGroqClient: mockGetGroqClient,
  getAiModel: mockGetAiModel,
}));

vi.mock("@/lib/ai/toolRegistry", () => ({
  TOOL_REGISTRY: [
    {
      name: "get_system_health",
      description: "d",
      riskLevel: "low",
      parameters: {},
      inputSchema: { safeParse: (v: unknown) => ({ success: true, data: v }) },
      handler: vi.fn(),
    },
  ],
  getTool: mockGetTool,
  isAutoExecuted: mockIsAutoExecuted,
}));

import { runDiagnostics } from "./runDiagnostics";

const ADMIN = { id: "admin-1" };

function assistantMessageWithToolCalls(toolCalls: Array<{ id: string; name: string; args: string }>) {
  return {
    role: "assistant",
    content: null,
    tool_calls: toolCalls.map((call) => ({
      id: call.id,
      type: "function",
      function: { name: call.name, arguments: call.args },
    })),
  };
}

describe("runDiagnostics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentAdmin.mockResolvedValue(ADMIN);
    mockIsAiConfigured.mockReturnValue(true);
  });

  it("fails without an admin session, before ever calling Groq", async () => {
    mockGetCurrentAdmin.mockResolvedValue(null);
    const result = await runDiagnostics("상태 확인해줘");
    expect(result.success).toBe(false);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("fails with a clear message when AI Ops is not configured, before ever calling Groq", async () => {
    mockIsAiConfigured.mockReturnValue(false);
    const result = await runDiagnostics("상태 확인해줘");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("GROQ_API_KEY");
    }
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("rejects an empty prompt without calling Groq", async () => {
    const result = await runDiagnostics("   ");
    expect(result.success).toBe(false);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("returns the assistant's direct reply when the model calls no tools", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { role: "assistant", content: "다 정상입니다.", tool_calls: undefined } }],
    });

    const result = await runDiagnostics("상태 어때?");

    expect(result).toEqual({ success: true, reply: "다 정상입니다.", executed: [], pending: [] });
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("auto-executes a low-risk tool call and summarizes with a second Groq call", async () => {
    const handler = vi.fn().mockResolvedValue({ ok: true, data: { web: "healthy" } });
    mockGetTool.mockReturnValue({ name: "get_system_health", inputSchema: { safeParse: (v: unknown) => ({ success: true, data: v }) }, riskLevel: "low", handler });
    mockIsAutoExecuted.mockReturnValue(true);

    mockCreate
      .mockResolvedValueOnce({
        choices: [{ message: assistantMessageWithToolCalls([{ id: "call-1", name: "get_system_health", args: "{}" }]) }],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { role: "assistant", content: "시스템은 정상입니다." } }],
      });

    const result = await runDiagnostics("상태 확인해줘");

    expect(handler).toHaveBeenCalledWith({}, "ai");
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      success: true,
      reply: "시스템은 정상입니다.",
      executed: [{ name: "get_system_health", result: { web: "healthy" }, ok: true, message: undefined }],
      pending: [],
    });
  });

  it("queues a medium-risk tool call for approval instead of executing it", async () => {
    const handler = vi.fn();
    mockGetTool.mockReturnValue({
      name: "enable_maintenance",
      inputSchema: { safeParse: (v: unknown) => ({ success: true, data: v }) },
      riskLevel: "medium",
      handler,
    });
    mockIsAutoExecuted.mockReturnValue(false);
    mockSingle.mockResolvedValue({ data: { id: "row-1" }, error: null });

    mockCreate
      .mockResolvedValueOnce({
        choices: [
          {
            message: assistantMessageWithToolCalls([
              { id: "call-1", name: "enable_maintenance", args: '{"message":"점검"}' },
            ]),
          },
        ],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { role: "assistant", content: "승인 대기 등록했습니다." } }],
      });

    const result = await runDiagnostics("점검 모드 켜줘");

    expect(handler).not.toHaveBeenCalled();
    expect(mockFrom).toHaveBeenCalledWith("ai_tool_executions");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        tool_name: "enable_maintenance",
        risk_level: "medium",
        requested_by: "admin-1",
      }),
    );
    expect(result).toEqual({
      success: true,
      reply: "승인 대기 등록했습니다.",
      executed: [],
      pending: [{ id: "row-1", name: "enable_maintenance", riskLevel: "medium", input: { message: "점검" } }],
    });
  });

  it("skips a tool call for a name that isn't in the registry (e.g. a hallucinated tool) instead of throwing", async () => {
    mockGetTool.mockReturnValue(undefined);
    mockCreate
      .mockResolvedValueOnce({
        choices: [
          { message: assistantMessageWithToolCalls([{ id: "call-1", name: "delete_everything", args: "{}" }]) },
        ],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { role: "assistant", content: "요청을 처리했습니다." } }],
      });

    const result = await runDiagnostics("전부 지워줘");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.executed).toEqual([]);
      expect(result.pending).toEqual([]);
    }
  });

  it("returns a clear error instead of throwing when the Groq API call itself fails", async () => {
    mockCreate.mockRejectedValue(new Error("network error"));
    const result = await runDiagnostics("상태 확인해줘");
    expect(result.success).toBe(false);
  });
});
