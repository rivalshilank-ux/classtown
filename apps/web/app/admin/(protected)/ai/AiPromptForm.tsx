"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert, Badge, Button, Card } from "@classtown/ui";
import { runDiagnostics, type RunDiagnosticsResult } from "@/lib/ai/runDiagnostics";

const RISK_TONE: Record<string, "good" | "accent" | "bad" | "wood"> = {
  low: "good",
  medium: "accent",
  high: "bad",
  critical: "bad",
};

export function AiPromptForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Extract<RunDiagnosticsResult, { success: true }> | null>(
    null,
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) {
      return;
    }
    setError(null);
    setResult(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const rawPrompt = formData.get("prompt");
    const prompt = typeof rawPrompt === "string" ? rawPrompt : "";

    startTransition(async () => {
      const response = await runDiagnostics(prompt);
      if (!response.success) {
        setError(response.error);
        return;
      }
      setResult(response);
      if (response.pending.length > 0) {
        // A new pending-approval row was created -- refresh the server-rendered list below.
        router.refresh();
      }
    });
  }

  return (
    <Card className="flex flex-col gap-3">
      <span className="font-[family-name:var(--font-display)] text-sm text-ink-900">
        AI에게 요청하기
      </span>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {error && <Alert variant="error">{error}</Alert>}
        <textarea
          name="prompt"
          rows={3}
          required
          disabled={isPending}
          placeholder="예: 지금 서비스 상태 확인해줘 / 오늘 밤 점검 공지 초안 작성해줘"
          className="pixel-corners-sm border-2 border-wood-600 bg-cream-400 px-3 py-2 text-sm text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
        />
        <Button type="submit" variant="secondary" isLoading={isPending} className="self-start">
          요청
        </Button>
      </form>

      {result && (
        <div className="flex flex-col gap-3 border-t-2 border-wood-600/40 pt-3">
          <p className="whitespace-pre-wrap text-sm text-ink-900">{result.reply}</p>

          {result.executed.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-xs text-ink-600">실행됨 (LOW)</span>
              {result.executed.map((call, index) => (
                <div key={`${call.name}-${index}`} className="flex items-center gap-2 text-xs">
                  <Badge tone={call.ok ? "good" : "bad"}>{call.name}</Badge>
                  <span className="text-ink-600">{call.message ?? (call.ok ? "완료" : "실패")}</span>
                </div>
              ))}
            </div>
          )}

          {result.pending.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-xs text-ink-600">승인 대기 등록됨</span>
              {result.pending.map((call) => (
                <div key={call.id} className="flex items-center gap-2 text-xs">
                  <Badge tone={RISK_TONE[call.riskLevel] ?? "wood"}>{call.riskLevel}</Badge>
                  <span className="text-ink-900">{call.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
