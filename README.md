# ClassTown

브라우저 기반 2D 멀티플레이어 교실 게임. pnpm/Turborepo 모노레포로 구성되어 있으며,
Colyseus 기반 authoritative 게임 서버, Next.js 웹앱, 공유 패키지들로 이루어져 있다.

## 구조

```
apps/
  game-server/   Colyseus 서버 — authoritative room/state/시뮬레이션
  web/           Next.js 앱 — Phaser 게임 클라이언트 마운트(/play) + 교사 인증(/login, /signup, /teacher)
packages/
  game-client/   Phaser 게임 클라이언트 — Colyseus 연결, 입력, TownRoom 렌더링
  shared-schema/ 서버-클라이언트가 공유하는 런타임 상태(Colyseus @colyseus/schema)
                 + zod 메시지/인증 스키마. dist/로 빌드되는 유일한 패키지 (아래 참고).
  shared-types/  앱 전반에서 공유하는 순수 TypeScript 타입 (런타임 코드 없음)
  ui/            공유 React 컴포넌트 (Tailwind 기반)
  i18n/          번역 사전 (기본 ko, en/ja/zh 지원)
  config/        공유 tsconfig base + ESLint base 설정
supabase/
  migrations/    Supabase Postgres 마이그레이션 (SQL)
```

## 요구 사항

- Node >= 22
- pnpm 11 (`package.json`의 `packageManager`에 고정됨) — Corepack으로 버전을 맞춘다:
  ```sh
  corepack enable
  corepack prepare pnpm@11.25.0 --activate
  ```

macOS/Windows 어느 쪽에서 개발하든 동일하게 동작한다. 이 저장소에는 별도의 네이티브
빌드 도구(Xcode Command Line Tools, Visual Studio Build Tools)가 필요 없다. 더 자세한
설치/실행 절차와 두 OS 사이에 실제로 다른 부분은
[`docs/development/setup.md`](./docs/development/setup.md) 참고.

## 설치

```sh
pnpm install
```

각 앱을 실행하기 전에 `.env.example`을 `.env.local`로 복사하고 실제 값을 채운다.

- `apps/game-server/.env.example`
- `apps/web/.env.example`

### Supabase 프로젝트 설정 (교사 인증에 필요)

1. [supabase.com](https://supabase.com)에서 새 프로젝트를 만든다.
2. 프로젝트 Settings → API에서 Project URL과 anon public key를 확인해
   `apps/web/.env.local`의 `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`에 채운다.
   (`SUPABASE_SERVICE_ROLE_KEY`는 현재 코드에서 사용하지 않는다 — 절대 커밋하지 말 것.)
3. `supabase/migrations/`의 SQL을 Supabase Studio의 SQL Editor에 붙여넣어 실행하거나,
   Supabase CLI가 있다면 `supabase db push`로 적용한다. 이 마이그레이션이
   `teacher_accounts` 테이블, RLS 정책, 그리고 회원가입 시 프로필을 자동 생성하는
   트리거를 만든다.
4. (선택) Authentication → Providers → Email에서 "Confirm email" 설정을 프로젝트
   정책에 맞게 켜거나 끈다 — 켜져 있으면 회원가입 후 이메일 인증이 필요하고, 꺼져
   있으면 가입 즉시 로그인된다. 코드는 두 경우 모두 올바르게 동작한다.

## 주요 명령어

레포 루트에서 실행 (Turborepo가 각 패키지로 나눠서 실행함):

```sh
pnpm dev         # 모든 앱을 watch 모드로 실행
pnpm build       # 모든 패키지/앱 빌드
pnpm typecheck   # 전체 tsc --noEmit
pnpm lint        # 전체 eslint
pnpm test        # test 스크립트가 있는 모든 패키지에서 vitest 실행
```

`shared-schema`는 raw TypeScript가 아니라 컴파일된 JS(`dist/`)를 배포하는 유일한
패키지다. `@colyseus/schema`의 `@type()` 데코레이터는 workspace 심링크를 통해
런타임에 트랜스폼될 수 없어서 실제 빌드 단계가 필요하다. `pnpm dev` / `pnpm build`는
이를 자동으로 처리하지만(turbo의 `^build` 의존성), turbo를 거치지 않고
`apps/game-server` 안에서 `tsx`/`vitest`를 직접 실행한다면 먼저 `shared-schema`를
빌드해야 한다.

```sh
pnpm --filter @classtown/shared-schema build
```

## 현재 상태

**Phase 0** — 스캐폴드 + 최소한의 authoritative `TownRoom`, Phaser 게임 클라이언트(`/play`):

- 검증된 입장 로직 (`onAuth` + zod `joinRoomOptionsSchema`)
- 서버 authoritative 이동: 클라이언트는 정규화된 `{ dx, dy }` 이동 의도만 전송하고,
  서버가 고정 20Hz 시뮬레이션을 돌려 `PlayerState.x/y`를 직접 결정한 뒤
  Colyseus state sync로 모든 클라이언트에 동기화
- `packages/game-client`(Phaser)가 `apps/web`의 `/play`에 마운트되어 키보드 입력 →
  이동 의도 전송 → 서버 시뮬레이션 → 상태 동기화 → 화면 렌더링까지 실제로 동작

**Phase 1** — Supabase 기반 교사 인증:

- 교사 회원가입(`/signup`)·로그인(`/login`)·로그아웃, 세션 기반 라우트 보호(`/teacher`)
- 비밀번호는 Supabase Auth만 관리 — `teacher_accounts`에는 프로필 정보만 저장
- Row Level Security로 교사는 자신의 프로필만 읽고 쓸 수 있음 (자세한 내용은
  `docs/adr/0001-teacher-authentication.md` 참고)
- 학생은 여전히 코드 기반 참가(별도 계정 없음) — 실제 참가 코드 검증은 다음 Phase

아직 구현되지 않음: 실제 joinCode 검증, 맵/충돌, NPC, 상점/인벤토리, 경제, 이벤트,
채팅, 교사/관리자 대시보드, 학생 인증.
