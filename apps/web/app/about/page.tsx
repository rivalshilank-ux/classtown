import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@classtown/ui";
import { DocShell, DocSection } from "../_components/docs/DocShell";

export const metadata: Metadata = {
  title: "About ClassTown",
  description:
    "ClassTown이 어떤 서비스인지, 학생과 선생님이 어떻게 참여하는지, 지금 제공되는 기능과 앞으로의 방향을 소개합니다.",
};

const LAST_UPDATED = "2026-09-05";

const TOC = [
  { id: "what", label: "ClassTown이란" },
  { id: "student-way", label: "학생이 참여하는 방법" },
  { id: "teacher-way", label: "선생님이 학급을 관리하는 방법" },
  { id: "space", label: "게임 공간과 커뮤니티" },
  { id: "now", label: "지금 제공되는 기능" },
  { id: "soon", label: "준비 중인 기능" },
  { id: "design", label: "디자인 철학" },
  { id: "stack", label: "기술적으로 사용하는 것들" },
  { id: "direction", label: "앞으로의 방향" },
];

function StatusBadge({ tone, children }: { tone: "good" | "wood"; children: string }) {
  return (
    <Badge tone={tone} className="shrink-0">
      {children}
    </Badge>
  );
}

export default function AboutPage() {
  return (
    <DocShell
      category="소개"
      title="About ClassTown"
      description="교실을 그대로 옮겨온, 나무와 픽셀로 만든 작은 학교 마을입니다."
      effectiveDate={LAST_UPDATED}
      dateLabel="최초 게시일"
      toc={TOC}
    >
      <DocSection id="what" title="ClassTown이란">
        <p>
          ClassTown은 학생과 선생님이 브라우저 하나로 같은 공간에 모이는 2D
          멀티플레이어 학교 마을입니다. 앱을 설치하거나 미리 계정을 만들 필요
          없이, 선생님이 알려준 학급 코드 하나면 학생은 곧바로 마을 안으로
          들어올 수 있습니다.
        </p>
        <p>
          교실 안에서만 일어나던 &ldquo;다 같이 모여 있는 느낌&rdquo;을,
          온라인 수업이나 자율 활동 시간에도 이어가고 싶다는 생각에서
          출발했습니다.
        </p>
      </DocSection>

      <DocSection id="student-way" title="학생이 참여하는 방법">
        <ol>
          <li>선생님이 칠판이나 화면으로 학급 코드를 알려줍니다.</li>
          <li>학생은 ClassTown 입장 화면에서 학급 코드와 자신의 닉네임을 입력합니다.</li>
          <li>바로 마을 화면으로 들어가, 같은 학급 친구들과 함께 돌아다닙니다.</li>
        </ol>
        <p>
          학생은 이메일이나 비밀번호 없이 참여하며, 다시 입장할 때는 처음
          발급받은 학생 코드로 같은 캐릭터에 이어서 접속할 수 있습니다.
        </p>
      </DocSection>

      <DocSection id="teacher-way" title="선생님이 학급을 관리하는 방법">
        <p>
          선생님은 이메일로 계정을 만들어 로그인한 뒤, 대시보드에서 학급을
          생성합니다. 학급을 만들면 참가 코드가 자동으로 발급되며, 이 코드를
          학생에게 안내하기만 하면 됩니다.
        </p>
        <p>대시보드에서 할 수 있는 것들:</p>
        <ul>
          <li>학급 참가 코드 확인 및 참가 열기/닫기</li>
          <li>지금 접속해 있는 학생 수와 전체 학생 목록(로스터) 확인</li>
          <li>학생 닉네임 변경, 참가 제한 등 로스터 관리</li>
          <li>최근 입장·퇴장 활동 확인</li>
        </ul>
      </DocSection>

      <DocSection id="space" title="게임 공간과 커뮤니티">
        <p>
          모든 학생은 같은 마을 공간 안에서 실시간으로 움직입니다. 위치는
          항상 서버가 판정하기 때문에, 누군가 화면을 조작해도 다른 학생에게는
          공정하게 똑같은 결과로 보여집니다.
        </p>
        <p>
          지금은 채팅이나 자유 게시판 같은 기능은 없습니다. 학생들이 서로
          주고받는 것은 &ldquo;같은 공간에 함께 있다&rdquo;는 감각과, 정해진
          게임 활동(입장, 이동, 퇴장)뿐입니다.
        </p>
      </DocSection>

      <DocSection id="now" title="지금 제공되는 기능">
        <ul>
          <li className="flex items-center justify-between gap-3">
            <span>선생님 회원가입 / 로그인 / 로그아웃</span>
            <StatusBadge tone="good">지금 가능</StatusBadge>
          </li>
          <li className="flex items-center justify-between gap-3">
            <span>학급 생성, 참가 코드 발급 및 참가 열기/닫기</span>
            <StatusBadge tone="good">지금 가능</StatusBadge>
          </li>
          <li className="flex items-center justify-between gap-3">
            <span>학급 코드 + 닉네임으로 학생 입장</span>
            <StatusBadge tone="good">지금 가능</StatusBadge>
          </li>
          <li className="flex items-center justify-between gap-3">
            <span>실시간 2D 마을에서 함께 이동하기</span>
            <StatusBadge tone="good">지금 가능</StatusBadge>
          </li>
          <li className="flex items-center justify-between gap-3">
            <span>학급 로스터, 접속 현황, 최근 활동 확인(선생님)</span>
            <StatusBadge tone="good">지금 가능</StatusBadge>
          </li>
          <li className="flex items-center justify-between gap-3">
            <span>레벨·플레이 시간 등 진행도 기록</span>
            <StatusBadge tone="good">지금 가능</StatusBadge>
          </li>
        </ul>
      </DocSection>

      <DocSection id="soon" title="준비 중인 기능">
        <p>
          아래 기능들은 방향이 정해졌거나 설계 중이지만, 아직 서비스에 구현되어
          있지 않습니다. PREVIEW 표시가 없는 한 지금은 이용할 수 없습니다.
        </p>
        <ul>
          <li className="flex items-center justify-between gap-3">
            <span>대시보드의 경험치·레벨·구역별 접속 현황, 퀘스트 기록 화면</span>
            <StatusBadge tone="wood">COMING SOON</StatusBadge>
          </li>
          <li className="flex items-center justify-between gap-3">
            <span>ClassTown 메신저(게임과 별도로 동작하는 독립 서비스)</span>
            <StatusBadge tone="wood">COMING SOON</StatusBadge>
          </li>
          <li className="flex items-center justify-between gap-3">
            <span>치트 툴(지정된 계정만 사용하는 제한적 운영 도구)</span>
            <StatusBadge tone="wood">COMING SOON</StatusBadge>
          </li>
          <li className="flex items-center justify-between gap-3">
            <span>관리자(운영) 전용 화면</span>
            <StatusBadge tone="wood">COMING SOON</StatusBadge>
          </li>
        </ul>
      </DocSection>

      <DocSection id="design" title="디자인 철학">
        <p>
          ClassTown은 나무(Wood) 재질과 픽셀(Pixel) 그래픽, 그리고 진짜
          게임처럼 느껴지는 조작감을 기본으로 삼습니다. 버튼을 누르면 살짝
          내려앉고, 테두리는 칠판이나 나무 액자처럼 딱 떨어지는 픽셀 모서리를
          갖습니다.
        </p>
        <p>
          화려한 그라데이션이나 유리 질감(glassmorphism) 대신, 교실과 칠판,
          나무 책상에서 느껴지는 익숙하고 따뜻한 색을 사용합니다. 그러면서도
          웹 접근성과 반응형 레이아웃 등 현대적인 웹 서비스의 기본기는
          그대로 지킵니다.
        </p>
      </DocSection>

      <DocSection id="stack" title="기술적으로 사용하는 것들">
        <ul>
          <li>Next.js — 선생님용 웹사이트와 학생 입장 화면</li>
          <li>Phaser — 브라우저에서 동작하는 2D 게임 클라이언트</li>
          <li>Colyseus — 여러 학생이 동시에 접속하는 실시간 게임 서버</li>
          <li>Supabase — 계정 인증과 학급·학생 데이터 저장</li>
        </ul>
      </DocSection>

      <DocSection id="direction" title="앞으로의 방향">
        <p>
          ClassTown은 지금도 활발히 만들어지는 중입니다. 다음 방향은{" "}
          <Link href="/support">지원 페이지</Link>와 이 페이지의{" "}
          <a href="#soon">준비 중인 기능</a> 목록을 통해 계속 갱신할
          예정이며, 큰 변경 사항은{" "}
          <Link href="/terms">이용약관</Link>과{" "}
          <Link href="/privacy">개인정보처리방침</Link>에도 함께 반영합니다.
        </p>
      </DocSection>
    </DocShell>
  );
}
