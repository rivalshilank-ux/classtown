import type { Metadata } from "next";
import Link from "next/link";
import { DocShell, DocSection } from "../_components/docs/DocShell";
import { DraftNotice, ContactNotice } from "../_components/docs/DraftNotice";

export const metadata: Metadata = {
  title: "ClassTown 이용약관",
  description:
    "ClassTown 서비스 이용에 관한 선생님과 학생의 권리, 의무 및 책임 사항을 안내합니다.",
};

const EFFECTIVE_DATE = "2026-09-05";

const TOC = [
  { id: "purpose", label: "제1조 목적" },
  { id: "definitions", label: "제2조 정의" },
  { id: "effect-and-change", label: "제3조 약관의 효력 및 변경" },
  { id: "teacher-account", label: "제4조 교사 계정" },
  { id: "student-use", label: "제5조 학생의 서비스 이용" },
  { id: "class-and-game", label: "제6조 학급 및 게임 공간 이용" },
  { id: "how-to-use", label: "제7조 서비스 이용 방법" },
  { id: "prohibited", label: "제8조 금지행위" },
  { id: "account-access", label: "제9조 계정 및 접근 권한" },
  { id: "content-ip", label: "제10조 콘텐츠 및 지식재산권" },
  { id: "service-change", label: "제11조 서비스 제공 및 변경" },
  { id: "service-suspension", label: "제12조 서비스 중단" },
  { id: "restriction-termination", label: "제13조 이용 제한 및 계약 해지" },
  { id: "disclaimer", label: "제14조 면책" },
  { id: "damages", label: "제15조 손해배상" },
  { id: "governing-law", label: "제16조 준거법 및 관할" },
  { id: "contact", label: "제17조 문의" },
];

export default function TermsPage() {
  return (
    <DocShell
      category="법적 문서"
      title="이용약관"
      description="ClassTown을 이용하는 선생님과 학생 모두에게 적용되는 이용 조건입니다."
      effectiveDate={EFFECTIVE_DATE}
      toc={TOC}
    >
      <DraftNotice />

      <DocSection id="purpose" title="제1조 목적">
        <p>
          이 약관은 ClassTown(이하 &ldquo;서비스&rdquo;)이 제공하는 브라우저
          기반 2D 멀티플레이어 학교 게임 및 관련 웹사이트 이용과 관련하여,
          서비스 운영자와 이용자 사이의 권리, 의무 및 책임 사항을 정하는 것을
          목적으로 합니다.
        </p>
      </DocSection>

      <DocSection id="definitions" title="제2조 정의">
        <ul>
          <li>
            <strong>&ldquo;서비스&rdquo;</strong>란 ClassTown 웹사이트와 그
            안에서 제공되는 게임 공간(타운), 교사 대시보드 등 관련 제반
            기능을 말합니다.
          </li>
          <li>
            <strong>&ldquo;교사&rdquo;</strong>란 이메일과 비밀번호로 회원가입
            절차를 거쳐 계정을 만들고, 학급을 생성·관리하는 이용자를
            말합니다.
          </li>
          <li>
            <strong>&ldquo;학생&rdquo;</strong>이란 별도의 회원가입 없이,
            교사가 발급한 학급 코드와 닉네임(또는 학생 참가 코드)으로 학급에
            입장하여 게임 공간을 이용하는 이용자를 말합니다.
          </li>
          <li>
            <strong>&ldquo;학급&rdquo;</strong>이란 교사가 생성하고, 참가
            코드를 통해 학생이 입장할 수 있는 하나의 게임 공간 단위를
            말합니다.
          </li>
          <li>
            <strong>&ldquo;참가 코드&rdquo;</strong>란 학생이 학급에 입장하기
            위해 사용하는, 서비스가 자동으로 발급하는 영문·숫자 조합 코드를
            말합니다.
          </li>
        </ul>
      </DocSection>

      <DocSection id="effect-and-change" title="제3조 약관의 효력 및 변경">
        <p>
          이 약관은 서비스 화면에 게시하거나 기타의 방법으로 공지함으로써
          효력이 발생합니다. 서비스 운영자는 관련 법령을 위반하지 않는 범위에서
          약관을 개정할 수 있으며, 개정 시 적용일자 및 개정 사유를 명시하여
          현행 약관과 함께 적용일자 7일 전부터 서비스 화면에 공지합니다.
          이용자에게 불리하게 변경되는 경우에는 최소 30일 전에 공지합니다.
        </p>
        <p>
          교사가 개정 약관의 적용일 이후에도 서비스를 계속 이용하는 경우
          개정 약관에 동의한 것으로 봅니다.
        </p>
      </DocSection>

      <DocSection id="teacher-account" title="제4조 교사 계정">
        <p>
          교사는 이름, 학교 이름, 이메일 주소, 비밀번호를 입력하여 회원가입할
          수 있습니다. 교사는 다음 사항을 준수합니다.
        </p>
        <ul>
          <li>가입 시 정확한 정보를 입력해야 합니다.</li>
          <li>
            자신의 계정 정보(이메일, 비밀번호)를 스스로 관리할 책임이 있으며,
            제3자에게 양도하거나 대여할 수 없습니다.
          </li>
          <li>
            자신이 생성한 학급과 그 학급에 속한 학생 정보에 대한 관리 책임을
            집니다(예: 학생 닉네임 변경, 참가 제한 등).
          </li>
        </ul>
        <p>
          현재 서비스는 학교 또는 개인 자격의 교사가 무료로 이용할 수 있으며,
          별도의 결제나 구독 절차는 존재하지 않습니다.
        </p>
      </DocSection>

      <DocSection id="student-use" title="제5조 학생의 서비스 이용">
        <p>
          학생은 별도의 회원가입, 이메일 제공, 비밀번호 설정 없이 교사가
          안내한 학급 코드와 스스로 정한 닉네임(또는 재입장 시 학생 참가
          코드)만으로 학급에 입장합니다.
        </p>
        <ul>
          <li>학생은 서비스 이용을 위해 계정을 만들거나 결제할 필요가 없습니다.</li>
          <li>
            학생이 정하는 닉네임은 실명일 필요가 없으며, 다른 사람을 사칭하거나
            불쾌감을 주는 표현을 사용해서는 안 됩니다.
          </li>
          <li>
            학생의 게임 진행 상황(레벨, 경험치, 플레이 시간)과 입장·퇴장 기록은
            담당 교사에게만 공개되며, 다른 학급이나 다른 학생에게 공개되지
            않습니다.
          </li>
          <li>
            만 14세 미만 학생의 서비스 이용에 관한 사항은{" "}
            <Link href="/privacy">개인정보처리방침</Link>을 함께 확인해
            주십시오.
          </li>
        </ul>
      </DocSection>

      <DocSection id="class-and-game" title="제6조 학급 및 게임 공간 이용">
        <p>
          교사는 학급을 생성하고, 참가 코드를 통해 학생의 입장 여부를 관리할
          수 있습니다. 교사는 학급의 참가 허용 여부를 언제든지 열거나 닫을 수
          있으며, 필요한 경우 참가 코드를 재발급할 수 있습니다.
        </p>
        <p>
          게임 공간(타운)은 실시간으로 여러 이용자가 함께 접속하여 캐릭터를
          움직이는 2D 공간입니다. 위치·이동 정보는 실시간으로만 처리되며
          별도로 보관되지 않습니다.
        </p>
      </DocSection>

      <DocSection id="how-to-use" title="제7조 서비스 이용 방법">
        <p>
          서비스는 별도의 프로그램 설치 없이 웹 브라우저를 통해 이용합니다.
          원활한 이용을 위해서는 안정적인 인터넷 연결과, 최신 버전의 크로미움
          기반 브라우저(Chrome, Edge 등, 크롬북 포함)를 권장합니다.
        </p>
      </DocSection>

      <DocSection id="prohibited" title="제8조 금지행위">
        <p>이용자(교사, 학생 모두)는 서비스를 이용하면서 다음 행위를 해서는 안 됩니다.</p>
        <ul>
          <li>다른 이용자의 참가 코드, 계정 정보를 무단으로 사용하거나 도용하는 행위</li>
          <li>다른 이용자를 사칭하거나, 모욕·비하·따돌림에 해당하는 표현을 사용하는 행위</li>
          <li>서비스의 정상적인 운영을 방해하는 행위(반복적인 비정상 접속 시도 등)</li>
          <li>서비스의 오류나 취약점을 이용해 부정하게 이득을 취하거나 다른 이용자에게 피해를 주는 행위</li>
          <li>스팸성 정보를 게시하거나 상업적 광고 목적으로 서비스를 이용하는 행위</li>
          <li>관련 법령 또는 이 약관, <Link href="/policy">운영정책</Link>에 위반되는 행위</li>
        </ul>
      </DocSection>

      <DocSection id="account-access" title="제9조 계정 및 접근 권한">
        <p>
          교사 계정과 이메일·비밀번호에 대한 관리 책임은 해당 교사에게
          있습니다. 계정 도용이나 비밀번호 유출이 의심되는 경우 즉시{" "}
          <Link href="/support">지원 페이지</Link>의 안내에 따라 알려주시기
          바랍니다.
        </p>
        <p>
          학생은 참가 코드와 닉네임만으로 접근하는 구조상 별도의 로그인
          비밀번호가 없으므로, 학급 코드는 같은 학급 학생들에게만 공유되도록
          교사가 관리해야 합니다.
        </p>
      </DocSection>

      <DocSection id="content-ip" title="제10조 콘텐츠 및 지식재산권">
        <p>
          서비스에 사용된 ClassTown 로고, 게임 그래픽, 텍스트 등 콘텐츠에 대한
          지식재산권은 서비스 운영자에게 있습니다. 이용자는 서비스 운영자의
          사전 동의 없이 이를 복제, 배포, 전송, 출판, 2차적 저작물 작성 등의
          방법으로 이용하거나 제3자에게 이용하게 할 수 없습니다.
        </p>
        <p>
          현재 서비스에는 학생이나 교사가 자유롭게 게시물, 이미지, 채팅 등을
          작성하여 공개하는 사용자 생성 콘텐츠(UGC) 기능이 없습니다. 학생이
          입력하는 닉네임은 학급 내부에서만 표시되는 짧은 표시 이름입니다.
        </p>
      </DocSection>

      <DocSection id="service-change" title="제11조 서비스 제공 및 변경">
        <p>
          서비스 운영자는 서비스의 전부 또는 일부를 상당한 이유가 있는 경우
          변경할 수 있습니다. 서비스는 현재도 활발히 개발 중이며, 일부 기능은{" "}
          <Link href="/about">서비스 소개 페이지</Link>에서 준비 중(PREVIEW /
          COMING SOON)으로 안내하고 있습니다.
        </p>
      </DocSection>

      <DocSection id="service-suspension" title="제12조 서비스 중단">
        <p>
          서비스 운영자는 시스템 점검, 서버 장애, 배포 작업 등 불가피한 사유가
          있는 경우 서비스 제공을 일시적으로 중단할 수 있습니다. 현재 서비스는
          정기 점검 일정이나 자동화된 상태 모니터링 체계를 갖추고 있지
          않으므로, 중단이 예고 없이 발생할 수 있습니다.
        </p>
      </DocSection>

      <DocSection id="restriction-termination" title="제13조 이용 제한 및 계약 해지">
        <p>
          이용자가 제8조(금지행위)를 위반하거나 관련 법령을 위반한 경우,
          서비스 운영자는{" "}
          <Link href="/policy">운영정책</Link>에 따라 경고, 학급 참가 제한,
          계정 이용 제한 등의 조치를 할 수 있습니다.
        </p>
        <p>
          교사는 언제든지 학급을 보관(비활성화) 처리하여 이용을 중단할 수
          있습니다. 계정 자체의 해지(탈퇴)는{" "}
          <Link href="/support">지원 페이지</Link>의 안내를 참고해 주십시오.
        </p>
      </DocSection>

      <DocSection id="disclaimer" title="제14조 면책">
        <p>
          서비스 운영자는 천재지변, 불가항력, 이용자의 귀책사유 또는 제3자
          서비스(인터넷 회선, 브라우저, 데이터베이스·호스팅 인프라 제공업체
          등)의 장애로 인해 서비스를 제공할 수 없는 경우 그에 대한 책임을 지지
          않습니다.
        </p>
        <p>
          서비스는 현재 개발 및 개선이 진행 중인 단계이며, 무중단 서비스나
          완전한 오류 없는 이용을 보장하지 않습니다.
        </p>
      </DocSection>

      <DocSection id="damages" title="제15조 손해배상">
        <p>
          서비스는 원칙적으로 무료로 제공되며, 관련 법령이 달리 정하지 않는
          한, 서비스 운영자는 서비스 이용과 관련하여 발생한 손해에 대해 고의
          또는 중대한 과실이 없는 한 책임을 지지 않습니다.
        </p>
      </DocSection>

      <DocSection id="governing-law" title="제16조 준거법 및 관할">
        <p>
          이 약관은 대한민국 법령에 따라 해석됩니다. 서비스 이용과 관련하여
          분쟁이 발생한 경우 관련 법령에 따른 관할 법원에 소를 제기할 수
          있습니다.
        </p>
      </DocSection>

      <DocSection id="contact" title="제17조 문의">
        <ContactNotice />
        <p className="pt-2 text-xs text-ink-600">
          함께 보기: <Link href="/privacy">개인정보처리방침</Link>,{" "}
          <Link href="/policy">운영정책</Link>
        </p>
        <p>공고일자 및 시행일자: {EFFECTIVE_DATE}</p>
      </DocSection>
    </DocShell>
  );
}
