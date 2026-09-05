import type { Metadata } from "next";
import Link from "next/link";
import { DocShell, DocSection } from "../_components/docs/DocShell";
import { DraftNotice, ContactNotice } from "../_components/docs/DraftNotice";

export const metadata: Metadata = {
  title: "ClassTown 운영정책",
  description:
    "ClassTown을 안전한 학급 공간으로 유지하기 위한 기본 이용 규칙과 신고·처리 절차를 안내합니다.",
};

const EFFECTIVE_DATE = "2026-09-05";

const TOC = [
  { id: "purpose", label: "기본 원칙" },
  { id: "respect", label: "다른 이용자 존중" },
  { id: "privacy", label: "개인정보 공유 금지" },
  { id: "account", label: "계정·권한 침해 금지" },
  { id: "cheating", label: "부정행위·버그 악용 금지" },
  { id: "disruption", label: "서비스 방해·스팸 금지" },
  { id: "content", label: "부적절한 콘텐츠 금지" },
  { id: "teacher-power", label: "교사 권한 악용 금지" },
  { id: "reporting", label: "신고 및 처리" },
  { id: "actions", label: "운영 조치 및 반복 위반" },
  { id: "emergency", label: "긴급하거나 심각한 안전 문제" },
];

export default function PolicyPage() {
  return (
    <DocShell
      category="가이드"
      title="운영정책"
      description="ClassTown은 학생이 함께 쓰는 공간입니다. 모두가 안전하게 지낼 수 있도록 지켜야 할 기본 규칙을 정리했습니다."
      effectiveDate={EFFECTIVE_DATE}
      toc={TOC}
    >
      <DraftNotice />

      <DocSection id="purpose" title="기본 원칙">
        <p>
          ClassTown은 학생과 선생님이 함께 쓰는 학급 공간입니다. 이 운영정책은
          법률 문서인 <Link href="/terms">이용약관</Link>을 학생도 이해하기
          쉬운 말로 풀어, 서비스 안에서 지켜야 할 구체적인 행동 기준을
          정합니다. 아래 규칙은 학생과 선생님 모두에게 적용됩니다.
        </p>
      </DocSection>

      <DocSection id="respect" title="1. 다른 이용자 존중">
        <ul>
          <li>같은 학급 친구들에게 예의 바르게 행동해요.</li>
          <li>욕설, 비하, 놀림, 따돌림에 해당하는 행동은 하지 않아요.</li>
          <li>다른 사람을 흉내 내거나 사칭하는 닉네임을 쓰지 않아요.</li>
        </ul>
      </DocSection>

      <DocSection id="privacy" title="2. 개인정보 공유 금지">
        <ul>
          <li>
            닉네임에 실명, 전화번호, 집 주소, 학교 밖 SNS 계정 등 개인정보를
            적지 않아요.
          </li>
          <li>
            다른 친구의 참가 코드나 개인정보를 학급 밖 다른 사람에게 알려주지
            않아요.
          </li>
        </ul>
      </DocSection>

      <DocSection id="account" title="3. 계정·권한 침해 금지">
        <ul>
          <li>다른 사람의 참가 코드나 교사 계정을 몰래 사용하지 않아요.</li>
          <li>
            자신의 참가 코드나 교사 계정 정보를 다른 사람에게 함부로 알려주지
            않아요.
          </li>
        </ul>
      </DocSection>

      <DocSection id="cheating" title="4. 부정행위·버그 악용 금지">
        <ul>
          <li>
            서비스의 오류(버그)를 발견했다면 이용하지 말고{" "}
            <Link href="/support">지원 페이지</Link>를 통해 알려주세요.
          </li>
          <li>
            프로그램을 조작하여 경험치, 레벨, 이동 속도 등을 비정상적으로
            바꾸는 행위는 금지돼요.
          </li>
        </ul>
      </DocSection>

      <DocSection id="disruption" title="5. 서비스 방해·스팸 금지">
        <ul>
          <li>
            짧은 시간에 반복적으로 입장을 시도하는 등 서비스 운영을 방해하는
            행동을 하지 않아요.
          </li>
          <li>광고, 홍보, 도배성 행동을 하지 않아요.</li>
        </ul>
      </DocSection>

      <DocSection id="content" title="6. 부적절한 콘텐츠 금지">
        <p>
          닉네임에 욕설, 선정적이거나 폭력적인 표현, 혐오 표현을 사용하지
          않아요. 선생님은 학급 로스터에서 부적절한 닉네임을 발견하면 직접
          수정하거나 참가를 제한할 수 있어요.
        </p>
      </DocSection>

      <DocSection id="teacher-power" title="7. 교사 권한 악용 금지">
        <p>
          교사는 학급과 학생 관리를 위해 닉네임 변경, 참가 제한 등의 권한을
          갖습니다. 이 권한은 학급 운영 목적으로만 사용해야 하며, 학생에게
          불이익을 주거나 개인적인 목적으로 남용해서는 안 됩니다.
        </p>
      </DocSection>

      <DocSection id="reporting" title="8. 신고 및 처리">
        <p>
          ClassTown에는 아직 서비스 안에서 직접 신고 버튼을 눌러 접수하는
          기능이 없습니다. 문제가 있다면 다음 순서로 알려주세요.
        </p>
        <ol>
          <li>
            <strong>학생</strong>은 가장 먼저 담당 선생님에게 이야기해 주세요.
          </li>
          <li>
            <strong>선생님</strong>은 학교의 담당자 또는{" "}
            <Link href="/support">지원 페이지</Link>의 안내를 통해 알려주세요.
          </li>
        </ol>
        <ContactNotice />
      </DocSection>

      <DocSection id="actions" title="9. 운영 조치 및 반복 위반">
        <p>
          위 규칙을 어긴 경우, 담당 선생님은 학급 로스터 화면에서 해당 학생의
          참가 상태를 변경하여 학급 재입장을 막을 수 있습니다. 이는 현재
          선생님이 사용할 수 있는 가장 직접적인 운영 조치입니다.
        </p>
        <p>
          같은 문제가 반복되거나 여러 학급에 걸친 문제로 확인되는 경우,
          서비스 운영자가 계정 단위의 이용 제한을 검토할 수 있습니다. 다만
          이용 제한 이전에 사실관계를 확인하며, 확인 없이 과도한 제재를 하지
          않는 것을 원칙으로 합니다.
        </p>
      </DocSection>

      <DocSection id="emergency" title="10. 긴급하거나 심각한 안전 문제">
        <p>
          학생의 안전이 걱정되는 상황(폭력, 괴롭힘, 위험한 상황 암시 등)은
          ClassTown 문의보다{" "}
          <strong>학교 선생님, 보호자, 또는 필요한 경우 관련 기관(112, 학교
          폭력 신고센터 117 등)에 먼저 알리는 것</strong>을 권장합니다.
          ClassTown은 아직 24시간 모니터링이나 긴급 대응 체계를 갖춘 서비스가
          아니므로, 급한 상황에서는 서비스 문의보다 즉시 도움을 받을 수 있는
          곳에 연락하는 것이 우선입니다.
        </p>
        <p className="pt-2 text-xs text-ink-600">
          함께 보기: <Link href="/terms">이용약관</Link>,{" "}
          <Link href="/privacy">개인정보처리방침</Link>
        </p>
      </DocSection>
    </DocShell>
  );
}
