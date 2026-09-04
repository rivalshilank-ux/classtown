# Local Development Setup

## Status

Implemented — describes the actual toolchain this repository builds and
tests with today, on macOS and Windows alike.

## Purpose

Get a new machine (this repository has been developed on Windows so far;
macOS is now also in active use) from a fresh clone to a running `pnpm dev`
with no guessing, and record the one or two things that actually differ
between the two operating systems for this specific repo.

## Architecture

See [`../architecture/overview.md`](../architecture/overview.md) for what
`apps/web`, `apps/game-server`, and the shared `packages/*` are. This
document is only about getting them running locally, not what they do.

## Current Implementation

### Prerequisites

- **Node.js >= 22** (`package.json` → `engines.node`, enforced at install
  time by `engine-strict=true` in `.npmrc`).
  - macOS: `brew install node@22`, or a version manager (`nvm`, `fnm`).
  - Windows: an installer from nodejs.org, or a version manager (`fnm`,
    `volta`).
- **pnpm**, pinned to the exact version in `package.json` →
  `packageManager` (`pnpm@11.25.0`). Do not install a different pnpm
  version globally and expect it to match — use Corepack, which reads
  that field automatically:
  ```sh
  corepack enable
  corepack prepare pnpm@11.25.0 --activate
  ```
- **Git**. No other system package is required to build or run this
  repository today — there are no native (`node-gyp`) dependencies of our
  own; the few packages that ship prebuilt native binaries (`esbuild`,
  `msgpackr-extract`, Next.js's `swc`/`lightningcss`) are resolved
  automatically per-OS/architecture by pnpm from the lockfile. Nothing
  here requires Xcode Command Line Tools or Visual Studio Build Tools.

### Clone and install

```sh
git clone https://github.com/rivalshilank-ux/classtown.git
cd classtown
pnpm install
```

### Environment variables

Copy each app's example file and fill in real values — never commit the
copies:

```sh
cp apps/web/.env.example apps/web/.env.local
cp apps/game-server/.env.example apps/game-server/.env.local
```

See [`../security/security.md`](../security/security.md) for exactly
which of these variables the code actually reads today. In short:
`apps/web` needs `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` to run its auth pages at all;
`apps/game-server` only reads `PORT` — the `SUPABASE_URL` /
`SUPABASE_SERVICE_ROLE_KEY` lines in its `.env.example` are unused
placeholders, not something the current game server reads.

### Running

From the repo root (Turborepo fans these out to each package):

```sh
pnpm dev         # apps/web (Next.js) + apps/game-server (Colyseus), watch mode
pnpm build       # build everything
pnpm typecheck   # tsc --noEmit everywhere
pnpm lint        # eslint everywhere
pnpm test        # vitest everywhere a test script exists
```

`packages/shared-schema` is the one package that ships compiled output
(`dist/`) instead of raw TypeScript — `@colyseus/schema`'s `@type()`
decorators don't transform correctly when consumed as source through a
pnpm workspace symlink, so a real `tsc` build step is required.
`pnpm dev` / `pnpm build` handle this automatically via Turborepo's
`^build` dependency graph. If you ever run `tsx` or `vitest` directly
inside `apps/game-server` without going through `turbo` (skipping that
graph), build `shared-schema` yourself first:

```sh
pnpm --filter @classtown/shared-schema build
```

### Optional CLIs

- **Supabase CLI** — already a pinned `devDependency`
  (`supabase@2.90.0`) at the repo root; run it via `pnpm exec supabase
  ...` rather than installing a separate global copy, so everyone uses
  the same version. `supabase login` opens a browser for authentication —
  same flow on macOS and Windows.
- **Vercel CLI** — not a project dependency; install as needed
  (`npx vercel`) for anything under
  [`../operations/operations.md`](../operations/operations.md).

## Planned

Nothing — this document already reflects the full current toolchain.
No CI pipeline enforces any of this automatically yet (see
[`../operations/operations.md`](../operations/operations.md)); it's run
manually before each commit/deploy today.

## Security

Never commit a filled-in `.env.local` — both are already `.gitignore`d.
See [`../security/security.md`](../security/security.md) for the full
secret-handling model.

## Testing

There is no test for this document itself; correctness is "a clean clone
on either OS reaches a working `pnpm dev`."

## Related Documents

- [`../architecture/overview.md`](../architecture/overview.md)
- [`../security/security.md`](../security/security.md)
- [`../operations/operations.md`](../operations/operations.md)
