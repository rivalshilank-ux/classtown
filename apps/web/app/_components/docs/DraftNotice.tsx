import { Alert } from "@classtown/ui";

/**
 * ClassTown has no legal review behind this document yet (see docs/operations,
 * docs/security — the project self-reports as pre-launch, no CI, no ops
 * process). Every legal-grade page must say so up front rather than imply a
 * finished policy.
 */
export function DraftNotice() {
  return (
    <Alert variant="warning">
      <span className="font-[family-name:var(--font-display)] text-base">
        준비 중인 문서
      </span>
      <br />
      본 문서는 ClassTown 서비스 운영을 위한 초안이며, 실제 서비스 정식 출시 전
      관련 법령 및 전문가 검토가 필요할 수 있습니다.
    </Alert>
  );
}

export function ContactNotice() {
  return (
    <p>
      ClassTown은 아직 상시 운영되는 이메일, 전화, 채팅 등의 고객센터 채널을
      갖추고 있지 않습니다. 문의 방법이 마련되는 대로 이 페이지에 안내합니다.
      그 전까지 학생은 담당 선생님에게, 선생님은 학교의 담당자를 통해 먼저
      알려주시기 바랍니다.
    </p>
  );
}
