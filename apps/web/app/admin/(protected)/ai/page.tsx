import { Alert, Card } from "@classtown/ui";
import { isAiConfigured } from "@/lib/ai/groqClient";
import { listPendingApprovals } from "@/lib/ai/approvals";
import { AiPromptForm } from "./AiPromptForm";
import { ApprovalRow } from "./ApprovalRow";

export const dynamic = "force-dynamic";

export default async function AdminAiPage() {
  const configured = isAiConfigured();
  const pending = configured ? await listPendingApprovals() : [];

  return (
    <>
      <div className="flex flex-col gap-1">
        <span className="font-[family-name:var(--font-display)] text-xs tracking-wide text-ink-600">
          ADMIN
        </span>
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-ink-900 sm:text-3xl">
          AI Ops
        </h1>
        <p className="text-sm text-ink-600">
          AI는 낮은 위험도 작업만 직접 실행합니다. 그 이상은 여기서 관리자가 승인해야 실행됩니다.
        </p>
      </div>

      {!configured ? (
        <Alert variant="info">
          <span className="font-[family-name:var(--font-display)] text-base">
            AI Ops가 설정되어 있지 않습니다
          </span>
          <br />
          서버 환경 변수 <code>GROQ_API_KEY</code>가 설정되면 사용할 수 있습니다.
        </Alert>
      ) : (
        <AiPromptForm />
      )}

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b-2 border-wood-600/40 text-xs text-ink-600">
              <th className="px-4 py-3 font-normal">위험도</th>
              <th className="px-4 py-3 font-normal">작업</th>
              <th className="px-4 py-3 font-normal">입력값</th>
              <th className="px-4 py-3 font-normal">요청 시각</th>
              <th className="px-4 py-3 font-normal">결정</th>
            </tr>
          </thead>
          <tbody>
            {pending.map((approval) => (
              <ApprovalRow key={approval.id} approval={approval} />
            ))}
            {pending.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink-600">
                  승인 대기 중인 작업이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </>
  );
}
