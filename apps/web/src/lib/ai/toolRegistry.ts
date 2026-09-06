import "server-only";
import { z } from "zod";
import type { LoggableActorType } from "@/lib/admin/audit";
import { getSystemHealthSnapshot, checkDatabaseReachable } from "@/lib/admin/health";
import { listAuditLogs } from "@/lib/admin/audit";
import { createAnnouncementDraftCore, draftSchema } from "@/lib/admin/announcementCore";
import { enableMaintenanceCore, disableMaintenanceCore, enableSchema } from "@/lib/admin/maintenanceCore";
import { getRecentCommits } from "@/lib/ai/github";
import { createUpdatePlanViaAdmin } from "@/lib/deploy/updatePlans";
import {
  triggerDeployHook,
  getPreviousProductionDeployment,
  promoteDeployment,
} from "@/lib/deploy/vercel";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface ToolResult {
  ok: boolean;
  data?: unknown;
  message?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  riskLevel: RiskLevel;
  /** JSON Schema shown to the model. The real gate is `inputSchema` below, validated server-side regardless of what the model sends. */
  parameters: Record<string, unknown>;
  inputSchema: z.ZodType;
  handler: (input: unknown, actorType: LoggableActorType) => Promise<ToolResult>;
}

const EMPTY_SCHEMA = { type: "object", properties: {}, required: [] } as const;
const emptyInput = z.object({});

/**
 * The security boundary for this entire feature: riskLevel is a plain field
 * on a hardcoded object below, never something the model's own output can
 * set or influence -- the model can only ever request a *name* from this
 * list, and the name is what determines risk, not any claim the model makes
 * about itself. See docs/adr/0005-ai-ops-tool-registry.md.
 */
export const TOOL_REGISTRY: readonly ToolDefinition[] = [
  {
    name: "get_system_health",
    description: "웹, 인증, 데이터베이스, 게임 서버의 현재 상태를 확인합니다.",
    riskLevel: "low",
    parameters: EMPTY_SCHEMA,
    inputSchema: emptyInput,
    handler: async () => {
      const databaseOk = await checkDatabaseReachable();
      const snapshot = await getSystemHealthSnapshot(databaseOk);
      return { ok: true, data: snapshot };
    },
  },
  {
    name: "get_recent_admin_actions",
    description: "최근 관리자/AI 작업 감사 로그(admin_audit_logs)를 조회합니다.",
    riskLevel: "low",
    parameters: EMPTY_SCHEMA,
    inputSchema: emptyInput,
    handler: async () => {
      const { items } = await listAuditLogs(1);
      return { ok: true, data: items };
    },
  },
  {
    name: "get_git_changes",
    description: "GitHub 저장소의 최근 커밋 내역을 조회합니다. GITHUB_TOKEN이 설정되어 있지 않으면 사용할 수 없습니다.",
    riskLevel: "low",
    parameters: EMPTY_SCHEMA,
    inputSchema: emptyInput,
    handler: async () => {
      const result = await getRecentCommits(10);
      return result.available
        ? { ok: true, data: result.commits }
        : { ok: false, message: result.reason };
    },
  },
  {
    name: "get_recent_errors",
    description: "최근 시스템 오류 목록을 조회합니다.",
    riskLevel: "low",
    parameters: EMPTY_SCHEMA,
    inputSchema: emptyInput,
    handler: () => Promise.resolve({
      ok: false,
      message: "오류 로그 수집 시스템이 아직 구축되지 않았습니다 (Planned).",
    }),
  },
  {
    name: "create_announcement_draft",
    description: "공개 공지 초안을 작성합니다. 초안은 게시되기 전까지 공개적으로 노출되지 않으며, 게시는 관리자가 직접 수행해야 합니다.",
    riskLevel: "low",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "공지 제목 (1-100자)" },
        body: { type: "string", description: "공지 내용 (1-2000자)" },
      },
      required: ["title", "body"],
    },
    inputSchema: draftSchema,
    handler: async (input, actorType) => {
      const result = await createAnnouncementDraftCore(input, actorType);
      return result.success ? { ok: true, data: result.data } : { ok: false, message: result.error };
    },
  },
  {
    name: "enable_maintenance",
    description: "점검 모드를 시작합니다. 학생 입장, 교사의 학급 변경, 신규 게임 접속이 차단됩니다. 관리자 승인이 필요합니다.",
    riskLevel: "medium",
    parameters: {
      type: "object",
      properties: {
        message: { type: "string", description: "공개적으로 표시할 점검 안내 메시지 (1-500자)" },
        reason: { type: "string", description: "내부 사유 (선택, 공개되지 않음)" },
      },
      required: ["message"],
    },
    inputSchema: enableSchema,
    handler: async (input, actorType) => {
      const result = await enableMaintenanceCore(input, actorType);
      return result.success ? { ok: true } : { ok: false, message: result.error };
    },
  },
  {
    name: "disable_maintenance",
    description: "진행 중인 점검 모드를 종료합니다. 관리자 승인이 필요합니다.",
    riskLevel: "medium",
    parameters: EMPTY_SCHEMA,
    inputSchema: emptyInput,
    handler: async (_input, actorType) => {
      const result = await disableMaintenanceCore(actorType);
      return result.success ? { ok: true } : { ok: false, message: result.error };
    },
  },
  {
    name: "restart_game_server",
    description: "게임 서버를 재시작합니다. 관리자 승인이 필요합니다.",
    riskLevel: "medium",
    parameters: EMPTY_SCHEMA,
    inputSchema: emptyInput,
    // apps/game-server has no deployment target anywhere -- there is
    // nothing a real API call could restart. Stays a permanent, honest stub
    // until that changes, unlike deploy_release/rollback_release below.
    handler: () =>
      Promise.resolve({
        ok: false,
        message: "게임 서버가 배포되어 있지 않아 재시작할 수 없습니다 (배포 인프라 없음).",
      }),
  },
  {
    name: "deploy_release",
    description: "최신 main 브랜치를 프로덕션에 배포합니다. 관리자 승인이 필요합니다.",
    riskLevel: "high",
    parameters: EMPTY_SCHEMA,
    inputSchema: emptyInput,
    handler: async () => {
      const result = await triggerDeployHook();
      return result.ok ? { ok: true } : { ok: false, message: result.message };
    },
  },
  {
    name: "rollback_release",
    description: "직전 프로덕션 배포로 롤백합니다. 가장 위험한 작업이며 관리자 승인이 반드시 필요합니다.",
    riskLevel: "critical",
    parameters: EMPTY_SCHEMA,
    inputSchema: emptyInput,
    handler: async () => {
      const previous = await getPreviousProductionDeployment();
      if (!previous.available) {
        return { ok: false, message: previous.reason };
      }
      const result = await promoteDeployment(previous.deployment.id);
      return result.ok ? { ok: true, data: previous.deployment } : { ok: false, message: result.message };
    },
  },
  {
    name: "create_update_plan",
    description: "최근 커밋 내역을 검토해 주간 업데이트 계획 초안을 작성합니다. 실제 배포는 이 계획이 관리자 승인을 받은 뒤 별도로 진행됩니다.",
    riskLevel: "medium",
    parameters: EMPTY_SCHEMA,
    inputSchema: emptyInput,
    handler: async () => {
      const plan = await createUpdatePlanViaAdmin();
      return plan ? { ok: true, data: plan } : { ok: false, message: "업데이트 계획 생성에 실패했습니다." };
    },
  },
] as const;

export function getTool(name: string): ToolDefinition | undefined {
  return TOOL_REGISTRY.find((tool) => tool.name === name);
}

export function isAutoExecuted(riskLevel: RiskLevel): boolean {
  return riskLevel === "low";
}
