# Operations

## Status

In Progress — deployment is Implemented (manual/git-triggered); scheduled
maintenance, automated backups, dependency scanning, regression
automation, and ops reporting are Planned.

## Purpose

Record how ClassTown is actually deployed and operated today, and be
explicit that no scheduled maintenance or automated ops process exists
yet — none of it should be assumed to be running.

## Architecture

```
git push (GitHub, rivalshilank-ux/classtown)
        │
        ▼
Vercel (Git-connected project, Root Directory: apps/web)
        │  installCommand: cd ../.. && pnpm install --frozen-lockfile
        │  buildCommand:   cd ../.. && pnpm turbo run build --filter=@classtown/web
        ▼
Preview deployment (non-production branch) or Production deployment
```

`apps/web/vercel.json` runs install/build from the monorepo root so
Turborepo's workspace graph resolves correctly, rather than trying to
build `apps/web` in isolation. `.vercelignore` (repo root) excludes
`.turbo`, `coverage`, and `*.tsbuildinfo` from the upload — none of these
are excluded by default the way `node_modules` is.

`apps/game-server` is not deployed anywhere today — it has been run only
locally (`pnpm start` / `pnpm dev`) during development and verification.

## Current Implementation

- **Deployment**: Vercel project connected to the GitHub repository.
  Pushing to the connected branch triggers a build; Production and
  Preview environments exist as separate Vercel deployment targets.
  Environment variables configured are limited to
  `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` — no
  service-role key or other secret is registered in Vercel.
- **Health check**: `apps/game-server` exposes `GET /health` → `{"status": "ok"}`,
  checked manually during development, not monitored in production
  (nothing is deployed to check).
- **Verification before deploy**: `pnpm typecheck`, `pnpm lint`,
  `pnpm test`, `pnpm build` are run manually from the repo root before
  each deployment step; there is no CI pipeline running these
  automatically on push today.

## Planned

None of the following is automated or scheduled today:

- Regular update cadence, and pre/post-update announcements.
- Scheduled maintenance windows (e.g. midnight/dawn maintenance, a
  weekly Sunday-dawn maintenance window).
- Emergency security patch process.
- Database health checks.
- Log management and retention policy.
- Backup and restore process (Supabase's own backup capabilities have
  not been configured or verified for this project).
- Dependency/security update checks (no `pnpm audit` or equivalent runs
  automatically).
- Automated regression testing on a schedule or on every push (CI).
- Automated deployment health checks post-deploy.
- Discord webhook–based operations reporting.

## Security

See [`../security/security.md`](../security/security.md) for secret
handling. No operational secret (service-role key, database password) is
stored in Vercel's environment variable configuration.

## Testing

`pnpm typecheck && pnpm lint && pnpm test && pnpm build`, run manually
from the repo root, is the current pre-deploy gate. There is no automated
CI enforcing this on every push.

## Related Documents

- [`../architecture/overview.md`](../architecture/overview.md)
- [`../security/security.md`](../security/security.md)
- [`../admin/admin.md`](../admin/admin.md)
