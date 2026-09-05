import type { Metadata } from "next";
import Link from "next/link";
import { DocShell, DocSection } from "../_components/docs/DocShell";
import { DraftNotice, ContactNotice } from "../_components/docs/DraftNotice";

export const metadata: Metadata = {
  title: "ClassTown 개인정보처리방침",
  description:
    "ClassTown이 수집하는 개인정보 항목과 이용 목적, 보관 기간을 실제 서비스 구조에 맞춰 안내합니다.",
};

const EFFECTIVE_DATE = "2026-09-05";

const TOC = [
  { id: "purpose", label: "개인정보처리방침의 목적" },
  { id: "collected-items", label: "수집하는 개인정보 항목" },
  { id: "collection-method", label: "개인정보 수집 방법" },
  { id: "purpose-of-use", label: "개인정보의 이용 목적" },
  { id: "retention", label: "개인정보의 보유 및 이용기간" },
  { id: "destruction", label: "개인정보의 파기" },
  { id: "third-party", label: "개인정보의 제3자 제공" },
  { id: "outsourcing", label: "개인정보 처리의 위탁" },
  { id: "overseas-transfer", label: "개인정보의 국외 이전" },
  { id: "security-measures", label: "개인정보의 안전성 확보조치" },
  { id: "user-rights", label: "이용자의 권리 및 행사 방법" },
  { id: "cookies", label: "쿠키 및 유사 기술" },
  { id: "auto-generated", label: "자동으로 생성되는 정보" },
  { id: "game-data", label: "서비스 이용 과정에서 생성되는 게임 관련 데이터" },
  { id: "officer", label: "개인정보 보호책임자 / 문의 방법" },
  { id: "changes", label: "개인정보처리방침의 변경" },
];

export default function PrivacyPage() {
  return (
    <DocShell
      category="법적 문서"
      title="개인정보처리방침"
      description="ClassTown을 이용하는 선생님과 학생의 개인정보를 어떻게 다루는지 설명합니다."
      effectiveDate={EFFECTIVE_DATE}
      toc={TOC}
    >
      <DraftNotice />

      <DocSection id="purpose" title="1. 개인정보처리방침의 목적">
        <p>
          ClassTown(이하 &ldquo;서비스&rdquo;)은 선생님과 학생이 하나의 2D
          공간에서 함께 만나는 브라우저 기반 학교 게임입니다. 이 방침은
          서비스가 어떤 개인정보를 수집하고, 어떤 목적으로 이용하며, 어떻게
          보관하고 파기하는지를 설명합니다.
        </p>
        <p>
          아래 내용은 실제 서비스 코드와 데이터베이스 구조를 확인하여 작성했으며,
          존재하지 않는 수집 항목이나 처리 절차를 기재하지 않았습니다.
        </p>
      </DocSection>

      <DocSection id="collected-items" title="2. 수집하는 개인정보 항목">
        <p>
          ClassTown은 선생님(교사)과 학생의 이용 방식이 다르며, 수집하는 정보도
          다릅니다.
        </p>
        <p className="font-medium text-ink-900">선생님(교사) 계정</p>
        <ul>
          <li>이름</li>
          <li>학교 이름</li>
          <li>이메일 주소 (로그인 아이디로 사용)</li>
          <li>
            비밀번호 (인증 서비스인 Supabase Auth가 암호화하여 저장하며,
            ClassTown은 원문 비밀번호를 저장하거나 열람하지 않습니다.)
          </li>
        </ul>
        <p>
          위 항목은 회원가입 화면에서 선생님이 직접 입력하며, 그 외 전화번호,
          주소, 생년월일 등은 수집하지 않습니다.
        </p>
        <p className="font-medium text-ink-900">학생</p>
        <p>
          학생은 별도의 회원가입이나 로그인을 하지 않습니다. 학생이 서비스에
          입장할 때 만들어지거나 사용되는 정보는 다음과 같습니다.
        </p>
        <ul>
          <li>
            닉네임 (학생이 직접 정하는 표시 이름, 1~20자. 실명일 필요가 없고,
            선생님이 로스터에서 변경할 수도 있습니다.)
          </li>
          <li>
            참가 코드(학급 코드 + 학생별 코드) — 서버가 자동으로 발급하는
            영문·숫자 조합으로, 그 자체로는 실제 신원을 알 수 없는 식별자입니다.
          </li>
        </ul>
        <p>
          학생에게 이메일, 전화번호, 생년월일, 실명, 사진 등을 요구하는 화면은
          존재하지 않습니다.
        </p>
        <p className="font-medium text-ink-900">서비스 이용 중 자동으로 만들어지는 정보</p>
        <ul>
          <li>
            최근 접속 시각 (학급에 접속해 있는지 여부를 선생님 화면에 보여주기
            위한 것으로, 대략 60초 간격 또는 입장·퇴장 시점에 갱신됩니다.)
          </li>
          <li>
            게임 활동 기록 — &ldquo;입장&rdquo;, &ldquo;퇴장&rdquo;처럼 미리
            정해진 종류의 사건만 기록되며, 학생이 자유롭게 입력한 문장이나
            채팅 내용은 포함되지 않습니다. (ClassTown에는 채팅 기능 자체가
            없습니다.)
          </li>
          <li>플레이 시간(초 단위)과 경험치·레벨 등 진행 상황</li>
          <li>
            접속 IP 주소 — 아래{" "}
            <a href="#auto-generated">&ldquo;자동으로 생성되는 정보&rdquo;</a>
            {" "}항목에서 자세히 설명합니다.
          </li>
        </ul>
        <p>
          게임 화면에서의 위치·이동 정보는 실시간 연결이 끊기면 사라지는
          방식으로만 처리되며, 데이터베이스에 저장되지 않습니다.
        </p>
      </DocSection>

      <DocSection id="collection-method" title="3. 개인정보 수집 방법">
        <ul>
          <li>선생님 회원가입·로그인 화면을 통한 직접 입력</li>
          <li>학급 참가(학생 입장) 화면을 통한 직접 입력(닉네임)</li>
          <li>
            서비스 이용 과정에서 자동으로 생성·저장(접속 시각, 입장·퇴장 기록,
            플레이 시간 등)
          </li>
        </ul>
      </DocSection>

      <DocSection id="purpose-of-use" title="4. 개인정보의 이용 목적">
        <ul>
          <li>선생님 계정 생성, 로그인 유지 및 본인 확인</li>
          <li>학급 생성·관리 및 참가 코드 발급</li>
          <li>학생의 학급 입장 처리 및 학급 내 접속 현황·활동 확인</li>
          <li>게임 진행 상황(레벨, 경험치, 플레이 시간) 제공</li>
          <li>
            부정 이용 방지 — 짧은 시간에 반복된 입장 시도를 제한하기 위한
            목적(자세한 내용은 국외 이전 및 자동 생성 정보 항목 참고)
          </li>
          <li>서비스 운영, 오류 확인 및 개선</li>
        </ul>
        <p>
          수집한 개인정보를 위 목적 외의 용도(예: 광고, 프로파일링, 제3자 마케팅)로
          이용하지 않습니다.
        </p>
      </DocSection>

      <DocSection id="retention" title="5. 개인정보의 보유 및 이용기간">
        <p className="font-medium text-ink-900">선생님 계정</p>
        <p>
          회원 탈퇴 시까지 보유합니다. 다만 현재 서비스 화면에는 선생님이 직접
          탈퇴할 수 있는 별도 메뉴가 아직 마련되어 있지 않습니다. 탈퇴나 계정
          삭제가 필요한 경우{" "}
          <a href="#officer">아래 문의 방법</a>을 통해 요청해 주시면 확인 후
          처리합니다. 이 부분은 정식 출시 전 반드시 보완이 필요한 항목으로
          기록해 둡니다.
        </p>
        <p className="font-medium text-ink-900">학급 및 학생 정보</p>
        <p>
          학급은 선생님이 &ldquo;보관(비활성화)&rdquo; 처리할 수 있으며, 이
          경우 학생이 더 이상 해당 학급으로 입장할 수 없습니다. 다만 현재
          코드베이스 기준으로 학급과 학생 데이터를 자동으로 완전히 삭제하는
          절차는 아직 구현되어 있지 않습니다. 이는 정식 출시 전에 마련해야 할
          과제로 이 문서에 정직하게 남겨 둡니다.
        </p>
        <p className="font-medium text-ink-900">일시적으로만 처리되는 정보</p>
        <p>
          접속 IP 주소는 데이터베이스에 저장되지 않고, 부정 이용 방지를 위해
          서버 메모리에서 짧은 시간(약 1분) 동안만 참고된 뒤 자동으로
          사라집니다.
        </p>
      </DocSection>

      <DocSection id="destruction" title="6. 개인정보의 파기">
        <p>
          보유기간이 지나거나 처리 목적이 달성된 개인정보는 지체 없이 파기하는
          것이 원칙입니다. 다만 위 &ldquo;보유 및 이용기간&rdquo; 항목에서 밝힌
          것처럼, 현재 서비스에는 계정·학급·학생 데이터를 자동으로 파기하는
          절차가 아직 구현되어 있지 않습니다. 파기가 필요한 경우{" "}
          <a href="#officer">문의 방법</a>을 통해 개별적으로 요청할 수 있으며,
          이 방침은 자동 파기 절차가 마련되는 대로 갱신됩니다.
        </p>
        <p>
          전자적 파일 형태로 저장된 정보는 복구할 수 없는 방법으로 삭제하고,
          종이 문서 형태의 개인정보는 애초에 발생하지 않습니다(모든 데이터는
          Supabase 데이터베이스에만 전자적으로 저장됩니다).
        </p>
      </DocSection>

      <DocSection id="third-party" title="7. 개인정보의 제3자 제공">
        <p>
          ClassTown은 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다.
          다만 법령에 특별한 규정이 있거나 수사기관이 법이 정한 절차와 방법에
          따라 요구하는 경우는 예외로 합니다.
        </p>
      </DocSection>

      <DocSection id="outsourcing" title="8. 개인정보 처리의 위탁">
        <p>
          ClassTown은 서비스 운영에 필요한 일부 기능을 아래 외부 인프라
          제공자에게 맡기고 있습니다. 이들은 ClassTown을 대신해 개인정보를
          처리하는 수탁자이며, 별도의 마케팅이나 광고 목적으로 이용하지
          않습니다.
        </p>
        <ul>
          <li>
            <strong>Supabase</strong> — 회원 인증, 데이터베이스 저장(학급,
            학생, 진행도 등 이 문서에 기재된 모든 항목)
          </li>
          <li>
            <strong>Vercel</strong> — 웹 애플리케이션(classtown 웹사이트)
            호스팅
          </li>
        </ul>
        <p>
          위 목록은 이 문서 작성 시점의 코드·배포 설정을 기준으로 확인한
          내용이며, 향후 위탁 업체가 추가·변경되면 이 방침을 통해 알립니다.
        </p>
      </DocSection>

      <DocSection id="overseas-transfer" title="9. 개인정보의 국외 이전">
        <p>
          위 위탁업체(Supabase, Vercel)는 해외에 서버 인프라를 두고 있는
          글로벌 서비스이므로, 이용자의 개인정보가 국외 서버에 저장·처리될 수
          있습니다. 다만 실제 이전되는 국가, 보관 위치, 이전 일시 등 세부
          사항은 서비스 운영자가 선택한 Supabase/Vercel 프로젝트 설정에 따라
          달라지며, 이 문서만으로 특정 국가를 단정할 수 없습니다.
        </p>
        <p>
          정식 출시 전, 실제 이용 중인 리전(지역) 정보를 확인하여 이전받는
          자, 이전 국가, 이전 일시 및 방법, 이전받는 자의 이용 목적과 보유·이용
          기간을 구체적으로 명시하도록 이 방침을 갱신할 예정입니다.
        </p>
      </DocSection>

      <DocSection id="security-measures" title="10. 개인정보의 안전성 확보조치">
        <ul>
          <li>
            <strong>접근 권한 제한</strong> — 데이터베이스는 행 단위 보안(Row
            Level Security)이 적용되어 있어, 선생님은 자신이 만든 학급과 그
            학급 학생 정보만 조회할 수 있습니다.
          </li>
          <li>
            <strong>비밀번호 보호</strong> — 선생님 비밀번호는 인증
            서비스(Supabase Auth)가 암호화하여 저장하며, ClassTown 애플리케이션
            코드는 원문 비밀번호를 다루지 않습니다.
          </li>
          <li>
            <strong>학생 인증 최소화</strong> — 학생은 계정·비밀번호 없이,
            1회용이며 짧은 시간(발급 후 약 2분) 안에만 유효한 입장권으로
            게임 서버에 연결됩니다. 입장권이 사용되면 즉시 무효화됩니다.
          </li>
          <li>
            <strong>서버 전용 비밀키 관리</strong> — 데이터베이스에 대한 강한
            권한을 가진 서비스 키는 서버 환경 변수로만 관리되며, 브라우저로
            전달되지 않습니다.
          </li>
          <li>
            <strong>최소 수집</strong> — 서비스 제공에 필요하지 않은 항목(주소,
            생년월일, 연락처 등)은 애초에 입력받지 않습니다.
          </li>
        </ul>
      </DocSection>

      <DocSection id="user-rights" title="11. 이용자의 권리 및 행사 방법">
        <p>
          선생님은 언제든지 교사 대시보드에서 본인의 이메일과 학교 이름을
          확인할 수 있습니다. 정정·삭제 등 대시보드에서 직접 처리할 수 없는
          요청은 <a href="#officer">아래 문의 방법</a>으로 알려주시면
          확인 후 처리합니다.
        </p>
        <p>
          학생은 별도 계정이 없으므로, 학생 개인정보(닉네임 등)에 대한
          열람·정정·삭제는 원칙적으로 담당 선생님을 통해 학급 내에서
          이루어집니다. 선생님은 학급 로스터 화면에서 학생 닉네임을 변경하거나
          참가 상태를 변경할 수 있습니다.
        </p>
        <p>
          학생이 만 14세 미만 아동일 수 있다는 점을 고려하여, ClassTown은
          학생에게 회원가입이나 개인 식별 정보 입력을 요구하지 않는 구조를
          기본값으로 하고 있습니다. 다만 아동 개인정보 처리에 관한 관련 법령상
          보호자 동의 등 추가로 필요한 절차가 있는지는 정식 출시 전 법률
          전문가의 검토가 필요하며, 이 문서가 그 검토를 대신하지 않습니다.
        </p>
      </DocSection>

      <DocSection id="cookies" title="12. 쿠키 및 유사 기술">
        <p>
          ClassTown은 광고나 이용자 추적을 위한 쿠키를 사용하지 않습니다.
          사용하는 저장 기술은 다음 두 가지뿐입니다.
        </p>
        <ul>
          <li>
            <strong>로그인 세션 쿠키</strong> — 선생님이 로그인 상태를 유지할
            수 있도록 인증 서비스(Supabase Auth)가 발급하는 쿠키입니다. 학생은
            로그인을 하지 않으므로 이 쿠키가 발급되지 않습니다.
          </li>
          <li>
            <strong>브라우저 세션 저장소(sessionStorage)</strong> — 학생이
            입장 화면에서 게임 화면으로 이동하는 동안, 입장권 정보와 닉네임,
            참가 코드를 현재 브라우저 탭에만 임시로 담아 두는 데 사용합니다.
            이 정보는 다른 서버로 전송되지 않고, 탭을 닫거나 브라우저를
            종료하면 사라집니다.
          </li>
        </ul>
      </DocSection>

      <DocSection id="auto-generated" title="13. 자동으로 생성되는 정보">
        <p>
          학생이 학급에 입장할 때, ClassTown 서버는 남용(짧은 시간에 반복된
          입장 시도 등)을 막기 위해 요청에 담긴 접속 IP 주소를 짧은 시간
          동안만 참고합니다. 이 처리에는 다음과 같은 특징이 있습니다.
        </p>
        <ul>
          <li>서버의 메모리에서만 처리되고, 데이터베이스에 저장되지 않습니다.</li>
          <li>
            약 1분의 기준 시간이 지나면 자동으로 사라지며, 서버가 재시작되어도
            남지 않습니다.
          </li>
          <li>다른 목적(위치 추적, 광고, 프로파일링 등)으로 이용되지 않습니다.</li>
        </ul>
        <p>
          이 외에 최근 접속 시각, 입장·퇴장 기록, 플레이 시간은 위{" "}
          <a href="#collected-items">&ldquo;수집하는 개인정보 항목&rdquo;</a>
          에서 설명한 대로 서비스 이용 중 자동으로 만들어집니다.
        </p>
      </DocSection>

      <DocSection id="game-data" title="14. 서비스 이용 과정에서 생성되는 게임 관련 데이터">
        <p>
          ClassTown의 게임 공간(타운)에서 만들어지는 데이터는 다음과 같이
          나뉩니다.
        </p>
        <ul>
          <li>
            <strong>저장되지 않는 데이터</strong> — 캐릭터의 실시간 위치와
            이동 정보는 게임 서버가 순간적으로만 처리하며, 데이터베이스에
            남기지 않습니다.
          </li>
          <li>
            <strong>저장되는 데이터</strong> — 경험치, 레벨, 누적 플레이
            시간(초 단위), 그리고 &ldquo;입장&rdquo;·&ldquo;퇴장&rdquo;처럼
            미리 정해진 종류의 활동 기록입니다. 활동 기록에는 학생이 자유롭게
            작성한 문장이 들어가지 않으며, ClassTown에는 채팅이나 자유 게시판
            기능 자체가 없습니다.
          </li>
        </ul>
        <p>
          이 데이터는 담당 선생님이 자신의 학급에 한해서만 조회할 수 있으며,
          다른 학급 선생님이나 다른 학생에게 공개되지 않습니다.
        </p>
      </DocSection>

      <DocSection id="officer" title="15. 개인정보 보호책임자 / 문의 방법">
        <ContactNotice />
        <p>
          개인정보 관련 문의(열람·정정·삭제 요청 포함)도 같은 방법으로
          받고 있으며, 상시 문의 채널이 마련되는 대로 이 항목을 갱신합니다.
        </p>
      </DocSection>

      <DocSection id="changes" title="16. 개인정보처리방침의 변경">
        <p>
          이 방침의 내용이 추가, 삭제 또는 수정되는 경우 시행 전에 이 페이지를
          통해 미리 공지합니다. 관련 법령이나 서비스 정책의 변경에 따라 내용이
          달라질 수 있습니다.
        </p>
        <p>공고일자: {EFFECTIVE_DATE}</p>
        <p>시행일자: {EFFECTIVE_DATE}</p>
        <p className="pt-2 text-xs text-ink-600">
          함께 보기: <Link href="/terms">이용약관</Link>,{" "}
          <Link href="/policy">운영정책</Link>
        </p>
      </DocSection>
    </DocShell>
  );
}
