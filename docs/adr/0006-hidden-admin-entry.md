# 0006: A Hidden Shortcut Is an Entry Point, Never an Authority

## Status

Accepted.

## Context

`/admin/login` is a normal, linkable URL. The ask was for a way to reach it
without it being an obvious, publicly advertised link from the main site —
a double-tap keyboard shortcut (Shift+Cmd on Mac, Shift+Ctrl on
Windows/Linux) — plus, on top of that, a genuinely new shared "Admin Code"
that gates the login form itself before real credentials are even
attempted. The one rule every prior phase of this project has enforced is
that the client never decides authorization; this phase applies that same
rule to something that looks, at first glance, like a client-side gate.

## Decision

**The shortcut grants nothing.** `useAdminShortcut()` does exactly one
thing on a successful double-tap: `router.push("/admin/login")`. It sets no
cookie, no `localStorage`/`sessionStorage` flag, no query parameter. Reaching
the page proves nothing to the server — the page's own guards
(`proxy.ts`, `app/admin/(protected)/layout.tsx`, `getCurrentAdmin()`) are
completely unaware the shortcut exists.

**Detection logic has no DOM in it.** `AdminShortcutDetector`
(`apps/web/src/hooks/adminShortcutDetector.ts`) is a plain class taking
`{key, isEditableTarget}` and an injectable clock — it can be, and is,
unit-tested without a browser or jsdom (neither exists in this repo's test
setup today). `useAdminShortcut.ts` is the only file that touches
`window`/`document`, translating real keyboard events into calls on the
detector.

**No OS detection.** Both combos (`Shift+Meta`, `Shift+Control`) are
recognized unconditionally rather than branching on `navigator.platform` —
unreliable in general, and `navigator.userAgentData` (the modern
replacement) isn't available in Safari or Firefox at all. A Mac keyboard
naturally produces `Meta`; a Windows/Linux keyboard naturally produces
`Control`. Each platform's users trigger only their own combo without the
code ever asking "what OS is this."

**The Admin Code is a pre-gate, not a second admin identity.** It is a
single shared secret, verified server-side (`verifyAdminCode()`,
`apps/web/src/lib/auth/adminCode.ts`) against a SHA-256 hash in
`ADMIN_CODE_HASH` (server env only — never `NEXT_PUBLIC_*`, never in the
client bundle) using `crypto.timingSafeEqual` for a constant-time
comparison. It fails closed: an unset `ADMIN_CODE_HASH` rejects every code,
because a missing config for a security gate must not silently become a
bypass. Checked, and rate-limited (`consumeRateLimit`, reused as-is from
the student join flow), **before** `signInAdmin()` ever calls Supabase —
a wrong code never attempts real credentials and never spends Supabase
Auth's own rate limit on a request that could never have succeeded anyway.
Getting the code right proves only that — it does not create a session,
does not touch `admin_accounts`, and does not change what `is_admin()`
returns for anyone. The real authorization is exactly what it was before
this phase: Supabase Auth + `admin_accounts` + RLS.

**Nothing about existing admin auth changed.** `admin_accounts`,
`getCurrentAdmin()`, `is_admin()`, the doubled route guard, and every RLS
policy from ADR 0003 are untouched. The only modified files are
`adminLoginSchema` (one new field), `AdminLoginForm.tsx` (one new input),
and `signInAdmin()` (one new check, first).

## Consequences

- Provisioning the Admin Code is a manual, out-of-band step
  (`pnpm --filter @classtown/web hash-admin-code -- "the-code"`, then set
  the printed hash as `ADMIN_CODE_HASH`) — the same posture as
  `create-admin.ts` for admin accounts themselves: no web-reachable way to
  set or change it.
- A Windows user holding Shift+the Windows key would also trigger the
  "Mac" branch, since both the Mac Command key and the Windows/Super key
  report `event.key === "Meta"` in every browser — an accepted, low-impact
  ambiguity inherent to not doing OS detection, not a bug.
- Rate limiting here inherits `consumeRateLimit()`'s own documented
  limitation: it's per-process, in-memory, and only throttles a single warm
  serverless instance rather than a whole fleet. Acceptable for a
  low-value-per-guess shared secret paired with real Supabase Auth behind
  it, not a substitute for a real distributed limiter if this ever needs
  to be hardened further.

## Related Documents

- [`0003-admin-authentication.md`](./0003-admin-authentication.md)
