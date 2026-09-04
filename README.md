# ClassTown

브라우저 기반 2D 멀티플레이어 교실 게임. pnpm/Turborepo 모노레포로 구성되어 있으며,
Colyseus 기반 authoritative 게임 서버, Next.js 웹앱, 공유 패키지들로 이루어져 있다.

## 구조

```
apps/
  game-server/   Colyseus 서버 — authoritative room/state/시뮬레이션
  web/           Next.js 앱 (Supabase 인증 클라이언트 구조만 존재, 아직 연결 안 됨)
packages/
  shared-schema/ 서버-클라이언트가 공유하는 런타임 상태(Colyseus @colyseus/schema)
                 + zod 메시지 스키마. dist/로 빌드되는 유일한 패키지 (아래 참고).
  shared-types/  앱 전반에서 공유하는 순수 TypeScript 타입 (런타임 코드 없음)
  ui/            공유 React 컴포넌트 (Tailwind 기반)
  i18n/          번역 사전 (기본 ko, en/ja/zh 지원)
  config/        공유 tsconfig base + ESLint base 설정
```

## 요구 사항

- Node >= 22
- pnpm 11 (`package.json`의 `packageManager`에 고정됨)

## 설치

```sh
pnpm install
```

각 앱을 실행하기 전에 `.env.example`을 `.env.local`로 복사하고 실제 값을 채운다.

- `apps/game-server/.env.example`
- `apps/web/.env.example`

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

**Phase 0** — 스캐폴드 + 최소한의 authoritative `TownRoom`:

- 검증된 입장 로직 (`onAuth` + zod `joinRoomOptionsSchema`)
- 서버 authoritative 이동: 클라이언트는 정규화된 `{ dx, dy }` 이동 의도만 전송하고,
  서버가 고정 20Hz 시뮬레이션을 돌려 `PlayerState.x/y`를 직접 결정한 뒤
  Colyseus state sync로 모든 클라이언트에 동기화
- 실제 Colyseus 서버를 띄우고 실제 `colyseus.js` 클라이언트로 접속하는 통합 테스트로 검증됨

아직 구현되지 않음: 실제 joinCode 검증, Supabase 인증, Phaser 게임 클라이언트,
맵/충돌, NPC, 상점/인벤토리, 경제, 이벤트, 채팅, 교사/관리자 대시보드.
