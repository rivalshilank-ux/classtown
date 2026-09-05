import type { Metadata } from "next";
import Link from "next/link";
import { DocShell, DocSection } from "../_components/docs/DocShell";
import { ContactNotice } from "../_components/docs/DraftNotice";

export const metadata: Metadata = {
  title: "ClassTown 지원",
  description:
    "학생 입장 문제, 참가 코드, 교사 계정, 게임 연결 등 자주 묻는 질문과 문의 방법을 안내합니다.",
};

const EFFECTIVE_DATE = "2026-09-05";

const TOC = [
  { id: "join-issues", label: "학생이 게임에 참가할 수 없어요" },
  { id: "class-code", label: "학급 코드 문제" },
  { id: "teacher-account", label: "교사 계정 문제" },
  { id: "connection", label: "게임 연결 문제" },
  { id: "browser", label: "브라우저 관련 문제" },
  { id: "privacy-inquiry", label: "개인정보 관련 문의" },
  { id: "policy-inquiry", label: "약관·정책 관련 문의" },
  { id: "bug-report", label: "버그 신고" },
  { id: "general", label: "일반 문의" },
];

export default function SupportPage() {
  return (
    <DocShell
      category="지원"
      title="지원"
      description="자주 묻는 질문을 먼저 확인해 보세요. 해결되지 않으면 문의 방법을 안내해 드립니다."
      effectiveDate={EFFECTIVE_DATE}
      dateLabel="최초 게시일"
      toc={TOC}
    >
      <DocSection id="join-issues" title="학생이 게임에 참가할 수 없어요">
        <ul>
          <li>
            학급 코드와 닉네임(또는 학생 참가 코드)을 다시 한번 확인해
            주세요. 코드는 영문 대문자와 숫자로 이루어진 6자리이며, 대소문자
            구분 없이 입력할 수 있습니다.
          </li>
          <li>
            헷갈리기 쉬운 글자(0/O, 1/I/L, U)는 참가 코드에 아예 사용하지
            않으니, 화면에 보이는 글자를 그대로 입력했는지 확인해 주세요.
          </li>
          <li>
            선생님이 학급의 참가를 일시적으로 닫아 두었을 수 있습니다.
            선생님에게 참가가 열려 있는지 확인해 주세요.
          </li>
          <li>
            닉네임은 1~20자 사이여야 합니다. 너무 짧거나 길면 오류 메시지가
            표시됩니다.
          </li>
          <li>
            같은 코드로 짧은 시간에 여러 번 반복 시도하면 잠시 후 다시
            시도하라는 메시지가 나올 수 있습니다. 잠시 기다린 뒤 다시
            시도해 주세요.
          </li>
        </ul>
      </DocSection>

      <DocSection id="class-code" title="학급 코드 문제">
        <ul>
          <li>학급 코드는 담당 선생님만 확인할 수 있습니다. 코드가 기억나지 않으면 선생님에게 다시 안내를 요청해 주세요.</li>
          <li>
            선생님은 필요하다고 판단하면 참가 코드를 새로 발급할 수 있습니다.
            코드가 바뀐 경우 이전 코드로는 입장할 수 없습니다.
          </li>
          <li>
            &ldquo;참가 코드를 확인해 주세요&rdquo;라는 안내만 표시되는 것은
            의도된 동작입니다. 잘못된 코드를 입력해도 정확히 어떤 부분이
            틀렸는지는 알려주지 않는데, 이는 다른 학급의 코드를 함부로
            추측하지 못하도록 하기 위한 보호 장치입니다.
          </li>
        </ul>
      </DocSection>

      <DocSection id="teacher-account" title="교사 계정 문제">
        <ul>
          <li>
            회원가입한 이메일로 이미 가입된 계정이 있다는 안내가 나오면, 그
            이메일로 로그인을 시도해 주세요.
          </li>
          <li>
            비밀번호는 영문과 숫자를 포함해 8자 이상이어야 합니다. 조건에
            맞지 않으면 입력 화면에서 바로 안내가 표시됩니다.
          </li>
          <li>
            이메일 인증이 필요한 경우 가입 시 입력한 이메일의 받은편지함(및
            스팸함)을 확인해 주세요.
          </li>
          <li>
            현재 서비스 화면에는 비밀번호를 잊어버렸을 때 스스로 재설정하는
            기능이 아직 없습니다. 이 부분은 준비 중이며, 그 전까지는{" "}
            <Link href="#general">아래 문의 방법</Link>으로 알려주세요.
          </li>
        </ul>
      </DocSection>

      <DocSection id="connection" title="게임 연결 문제">
        <ul>
          <li>
            게임 화면이 계속 로딩 중이거나 연결이 끊긴다면, 페이지를 새로
            고침한 뒤 학급 코드로 다시 입장해 주세요.
          </li>
          <li>
            학교나 기관 네트워크는 방화벽 정책으로 실시간 게임 연결(웹소켓)에
            필요한 통신을 차단하는 경우가 있습니다. 다른 네트워크(가정용 와이파이
            등)에서도 같은 문제가 발생하는지 확인해 보면 원인을 좁히는 데
            도움이 됩니다.
          </li>
          <li>
            입장권은 발급 후 짧은 시간 안에만 유효합니다. 입장 화면에서 너무
            오래 머무르다 게임 화면으로 넘어가면 다시 입장해야 할 수 있습니다.
          </li>
        </ul>
      </DocSection>

      <DocSection id="browser" title="브라우저 관련 문제">
        <ul>
          <li>
            최신 버전의 크로미움 기반 브라우저(Chrome, Edge 등)를 권장하며,
            학교에서 흔히 쓰는 크롬북에서도 별도 설치 없이 그대로 열립니다.
          </li>
          <li>
            브라우저의 시크릿/비공개 모드이거나 쿠키·사이트 데이터가 차단되어
            있으면 로그인 유지나 학생 입장 정보 전달이 정상적으로 되지 않을
            수 있습니다. 해당 설정을 확인해 주세요.
          </li>
          <li>
            화면이 깨지거나 그래픽이 표시되지 않으면 브라우저 확장 프로그램을
            잠시 꺼 보거나, 브라우저를 최신 버전으로 업데이트해 주세요.
          </li>
        </ul>
      </DocSection>

      <DocSection id="privacy-inquiry" title="개인정보 관련 문의">
        <p>
          어떤 개인정보를 수집하고 어떻게 이용하는지는{" "}
          <Link href="/privacy">개인정보처리방침</Link>에서 자세히 확인할 수
          있습니다. 열람·정정·삭제 요청 등 추가 문의는 아래 문의 방법을
          이용해 주세요.
        </p>
      </DocSection>

      <DocSection id="policy-inquiry" title="약관·정책 관련 문의">
        <p>
          서비스 이용 조건은 <Link href="/terms">이용약관</Link>을, 학급 내
          이용 규칙은 <Link href="/policy">운영정책</Link>을 참고해 주세요.
          해석이 필요한 부분은 아래 문의 방법으로 알려주세요.
        </p>
      </DocSection>

      <DocSection id="bug-report" title="버그 신고">
        <p>
          화면 오작동, 잘못된 안내 문구, 게임 중 이상 동작 등을 발견하면
          아래 문의 방법으로 알려주세요. 신고 시 다음 정보를 함께 보내주시면
          확인이 빨라집니다.
        </p>
        <ul>
          <li>어떤 화면(예: 학생 입장, 교사 대시보드, 게임 화면)에서 발생했는지</li>
          <li>어떤 동작을 했는데 무엇이 예상과 다르게 동작했는지</li>
          <li>사용 중인 브라우저와 기기 종류(예: Chrome, 크롬북)</li>
        </ul>
      </DocSection>

      <DocSection id="general" title="일반 문의">
        <ContactNotice />
      </DocSection>
    </DocShell>
  );
}
