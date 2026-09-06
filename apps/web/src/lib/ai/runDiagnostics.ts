"use server";

import type Groq from "groq-sdk";
import { getCurrentAdmin } from "@/lib/auth/getCurrentAdmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAiConfigured, getGroqClient, getAiModel } from "@/lib/ai/groqClient";
import { TOOL_REGISTRY, getTool, isAutoExecuted, type RiskLevel } from "@/lib/ai/toolRegistry";

export interface ExecutedToolCall {
  name: string;
  result: unknown;
  ok: boolean;
  message?: string;
}

export interface PendingToolCall {
  id: string;
  name: string;
  riskLevel: RiskLevel;
  input: unknown;
}

export type RunDiagnosticsResult =
  | { success: true; reply: string; executed: ExecutedToolCall[]; pending: PendingToolCall[] }
  | { success: false; error: string };

const SYSTEM_PROMPT = `당신은 ClassTown 서비스의 운영을 보조하는 AI Ops 어시스턴트입니다.
제공된 도구만 사용해서 상태를 확인하거나 작업을 제안하세요. 도구 없이 추측하지 마세요.
위험도가 낮은(low) 도구는 즉시 실행되어 결과가 주어집니다.
그 이상 위험도(medium/high/critical)의 도구는 실행되지 않고 관리자 승인 대기열에 등록되며,
"실행 결과"가 아니라 "승인 대기 등록됨"으로 안내됩니다. 이 도구들이 실제로 실행되었다고
단정하지 말고, 관리자 승인이 필요하다고 명확히 안내하세요.
답변은 한국어로, 간결하게 작성하세요.`;

function toGroqTools(): Groq.Chat.Completions.ChatCompletionTool[] {
  return TOOL_REGISTRY.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

/**
 * The only entry point that calls Groq. Checks admin status itself, before
 * ever making an external API call -- relying solely on the page being
 * admin-gated would still let a direct call to this "use server" action
 * spend real Groq quota before any downstream RLS check ever runs.
 */
export async function runDiagnostics(prompt: string): Promise<RunDiagnosticsResult> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return { success: false, error: "관리자 세션이 필요합니다." };
  }

  if (!isAiConfigured()) {
    return { success: false, error: "AI Ops가 설정되어 있지 않습니다. GROQ_API_KEY를 설정해 주세요." };
  }

  const trimmedPrompt = prompt.trim();
  if (!trimmedPrompt) {
    return { success: false, error: "요청 내용을 입력해 주세요." };
  }

  const groq = getGroqClient();
  const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: trimmedPrompt },
  ];

  let firstResponse: Groq.Chat.Completions.ChatCompletion;
  try {
    firstResponse = await groq.chat.completions.create({
      model: getAiModel(),
      messages,
      tools: toGroqTools(),
      tool_choice: "auto",
    });
  } catch (error) {
    console.error("Groq chat.completions.create failed:", error);
    return { success: false, error: "AI 서비스 호출에 실패했습니다. 잠시 후 다시 시도해 주세요." };
  }

  const assistantMessage = firstResponse.choices[0]?.message;
  const toolCalls = assistantMessage?.tool_calls ?? [];

  const executed: ExecutedToolCall[] = [];
  const pending: PendingToolCall[] = [];

  if (toolCalls.length > 0) {
    messages.push(assistantMessage!);

    for (const call of toolCalls) {
      const tool = getTool(call.function.name);
      if (!tool) {
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify({ ok: false, message: "unknown tool" }),
        });
        continue;
      }

      let rawInput: unknown = {};
      try {
        rawInput = call.function.arguments ? JSON.parse(call.function.arguments) : {};
      } catch {
        // Malformed JSON from the model -- validated (and rejected) below by inputSchema instead.
      }

      const parsed = tool.inputSchema.safeParse(rawInput);
      if (!parsed.success) {
        const message = "입력값이 도구 요구사항과 맞지 않습니다.";
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify({ ok: false, message }),
        });
        executed.push({ name: tool.name, result: null, ok: false, message });
        continue;
      }

      if (isAutoExecuted(tool.riskLevel)) {
        const result = await tool.handler(parsed.data, "ai");
        executed.push({ name: tool.name, result: result.data, ok: result.ok, message: result.message });
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      } else {
        const supabase = await createSupabaseServerClient();
        const { data, error } = await supabase
          .from("ai_tool_executions")
          .insert({
            tool_name: tool.name,
            risk_level: tool.riskLevel,
            input: parsed.data as never,
            requested_by: admin.id,
          })
          .select("id")
          .single();

        if (error || !data) {
          console.error("Failed to queue AI tool execution:", error?.message);
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify({ ok: false, message: "승인 대기열 등록에 실패했습니다." }),
          });
          continue;
        }

        pending.push({ id: data.id, name: tool.name, riskLevel: tool.riskLevel, input: parsed.data });
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify({
            ok: true,
            message: `${tool.riskLevel} 위험도 작업이라 실행되지 않았습니다. 관리자 승인 대기열에 등록되었습니다.`,
          }),
        });
      }
    }
  }

  const finalReply =
    toolCalls.length > 0
      ? await summarize(groq, messages)
      : (assistantMessage?.content ?? "");

  return { success: true, reply: finalReply, executed, pending };
}

async function summarize(
  groq: Groq,
  messages: Groq.Chat.Completions.ChatCompletionMessageParam[],
): Promise<string> {
  try {
    const response = await groq.chat.completions.create({
      model: getAiModel(),
      messages,
    });
    return response.choices[0]?.message?.content ?? "";
  } catch (error) {
    console.error("Groq follow-up summary call failed:", error);
    return "도구 실행 결과를 요약하는 중 오류가 발생했습니다. 위 실행/대기 목록을 확인해 주세요.";
  }
}
