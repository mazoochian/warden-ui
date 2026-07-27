# warden-ui Roadmap

Planned 2026-07-27, nothing built yet. See `ARCHITECTURE.md` for the
reasoning behind every decision referenced here, and `API.md` for the
endpoint shapes each phase adds. Phased the same way warden's own
`ROADMAP.md` is: each phase ships something independently useful, ordered
so nothing later depends on something not yet built, with effort sized
S/M/L/XL and explicit dependencies.

This is a genuinely large project — full parity with everything warden
can already do, plus an auth system, plus RBAC, plus a live "speak as the
bot" surface. It is **not** a one-shot. Treat this file as the backlog;
update phase statuses as they land, same convention warden's own roadmap
uses.

Status as of 2026-07-28: **Phase 0 done** (on the warden repo's
`feature/api-server` branch, not merged to master yet — see PR #1
there); **Phase 1's shell is done**, real login wiring starting now.
`ARCHITECTURE.md` §11's open questions from the overnight session were
all resolved by Armin on 2026-07-28 — see each phase's own status line
below for how those decisions land.

---

## Phase 0 — API foundations in warden itself
*Effort: L. Dependencies: none. Status: done (2026-07-27, on
`feature/api-server`, not yet merged to master — draft PR #1 exists
purely so CI has something to run against). Every item below shipped,
including the dev-login stub and a real socket-level integration test
that wasn't originally scoped but turned out necessary to actually prove
the HTTP server code works without needing live Telegram credentials.*

Everything downstream needs this, so it goes first even though nothing
user-visible ships yet.

- New `src/api/` module in warden: an HTTP+WebSocket accept loop built on
  `std.http.Server` (confirmed available in the Zig 0.16 toolchain
  already in use, including native WebSocket upgrade support — see
  `ARCHITECTURE.md` §1), a small router (method+path dispatch, no need
  for a full framework at this scale), and `std.json`-based
  request/response (de)serialization.
- Concurrency shape: mirror the existing per-connector `WorkerPool`
  pattern (`worker_pool.zig`) rather than inventing a new one — one
  accept loop feeding a bounded worker pool, so a slow/stuck API request
  can't wedge the bot's own message processing (or vice versa). New
  `WARDEN_API_PORT`/`WARDEN_API_WORKERS` config, same `Config.load`
  convention as every other tunable.
- New migrations (16+): `accounts`, `account_identities`, `web_sessions`,
  `oauth_providers`, `feature_flags` (seeded with every existing module,
  `enabled = true`), `dynamic_config`, `audit_log` — see
  `ARCHITECTURE.md` §4 for exact shapes.
- Session auth middleware: HMAC-SHA256-signed opaque session cookie,
  `web_sessions` lookup, attaches the resolved account+roles to the
  request context every handler sees.
- `GET /api/v1/auth/session` is the one endpoint that must exist by the
  end of this phase, purely to prove the whole chain (cookie → session
  row → account → linked identities → resolved roles) actually works
  end to end, even with no real login method wired up yet (a
  test-only/dev-only "log in as identity X" endpoint, gated to only
  exist when a dev flag is set, is reasonable scaffolding here and should
  be explicitly removed/disabled before Phase 1's real logins land).
- Audit log write-path built in from the start (a helper every future
  mutating handler calls), not retrofitted later — see
  `ARCHITECTURE.md` §4's reasoning.
- Verification: `zig build` **and** `zig build test` both green (the
  reachability gotcha in `ARCHITECTURE.md` §10 applies in full here,
  since API code is exactly the kind of thing only reachable from real
  request-handling, not from existing tests) — plus a manual `curl`
  smoke-test round-trip against a running local instance before calling
  this phase done.

## Phase 1 — Real login + frontend shell
*Effort: L. Dependencies: Phase 0. Status: shell done (2026-07-27, on
master), real login wiring not started. The three login methods below,
account linking, and the session-list UI are all still ahead.*

- ~~warden-ui repo gets its actual scaffolding~~ Done: Next.js (App
  Router) + TypeScript + `@fluentui/react-components`, `FluentProvider`
  wired for light/dark (a theme toggle, persisted per-browser, with a
  blocking inline script avoiding a flash of the wrong theme), TanStack
  Query installed and ready for Phase 2. Every dashboard route exists as
  a real page today (most render a `PlaceholderPage` naming which phase
  builds them); the nav nesting (Modules/Admin categories) matches this
  roadmap's own module list.
- Telegram Login Widget (HMAC verification server-side, per
  `ARCHITECTURE.md` §3.1) — the recommended *first* login method to wire
  up, since it needs no external provider registration/config and
  resolves directly to a bot identity that already exists for most
  admins.
- Google OAuth2 code-flow login (needs a Google Cloud OAuth client
  registered — an external setup step, not just code).
- Generic OIDC login against an admin-configured `oauth_providers` row
  (needs at least one real IdP to test against — Authentik/Keycloak in a
  throwaway dev container is enough, doesn't need to be the same one
  used in production).
- Account linking flow (`ARCHITECTURE.md` §3.3): "add another login
  method" from an account settings page.
- Basic app shell: nav, the account menu, session list (`/me/sessions`)
  with per-session revoke, logout.
- The two open questions that used to block later phases (Bot View's
  access tier, ownership-transfer scope) are now decided — see
  `ARCHITECTURE.md` §11 — so this phase's own scope is unchanged, just no
  longer waiting on anything.

## Phase 2 — Read-only admin dashboard
*Effort: M. Dependencies: Phase 1.*

The first phase where the panel actually shows something worth logging
in for, deliberately read-only (lowest risk, fastest to real value).

- `GET /admin/stats/overview`, `/admin/chats`, `/admin/identities` and
  their detail views (§`API.md`) — reuses `store/stats.zig`'s existing
  query logic where it already computes what's needed, extended where it
  doesn't (e.g. growth-over-time needs a time-bucketed query that likely
  doesn't exist yet).
- Frontend: dashboard home (overview tiles), a chats directory + detail
  page, a users directory + detail page — all read-only, RBAC-gated to
  bot admin/owner per `ARCHITECTURE.md` §7.
- This phase is a good place to pull in the `dataviz` design guidance
  (already available as a skill) once real chart/stat-tile work starts,
  rather than improvising chart styling from scratch.

## Phase 3 — Module toggles + dynamic config panel
*Effort: M (was M, now slightly larger — see the provider hot-swap item
below). Dependencies: Phase 0 (feature_flags/dynamic_config tables),
Phase 2 (dashboard shell to hang this off of).*

- Wire `feature_flags` reads into every module's dispatch branch in
  `main.zig` (standalone commands) and into `tools/registry.zig`'s list
  construction (LLM-tool-shaped features) — see `ARCHITECTURE.md` §5 for
  exactly which features fall in which bucket.
- Wire `dynamic_config` reads into the handful of currently-env-only
  fields identified as safe in `ARCHITECTURE.md` §6's table — each one
  individually: read `dynamic_config` first, fall back to the existing
  env-sourced `Config` value if no DB row exists yet, so this ships with
  zero behavior change until someone actually flips something.
- Decided 2026-07-28 (Armin): `WARDEN_LLM_PROVIDER` becomes hot-swappable
  here too, not just the model — the provider object currently gets
  constructed once at startup, so this needs a small refactor to
  re-resolve the active provider per call (or on write) instead of
  holding a fixed instance. Scoped to this phase since it's the same
  `dynamic_config` plumbing as everything else above, just one field
  that needs the extra indirection.
- Frontend: a modules page (toggle switches, one per feature, with the
  LLM-tool ones visually grouped separately from standalone commands
  since they behave differently under the hood even though the UI
  treats them the same) and a config page (grouped by category, secrets
  rendered masked and non-interactive per the `ARCHITECTURE.md` §6
  table).
- Every toggle/change writes to `audit_log` (already built in Phase 0) —
  surface *some* of that trail on this same page (a lightweight
  "recently changed" list), full audit log browsing waits for Phase 7.

## Phase 4 — Per-chat group settings (group-admin-facing)
*Effort: M. Dependencies: Phase 1 (RBAC/session), Phase 2 (chat directory
to select from).*

- `GET`/`PATCH /chats/:id/settings` (persona, magic word, digest,
  thinking override) — same store functions the slash commands already
  call, gated by the live `connector.isGroupAdmin` check described in
  `ARCHITECTURE.md` §7, not a cached DB role.
- `GET`/`PATCH /me/settings` (personal reminder timezone/date/time
  format) — the one piece of this whole project that's *pure* UI work on
  top of already-complete backend logic, since `store/user_settings.zig`
  already exists in full from this session's work. Good first
  "real feature, not just plumbing" milestone.
- Frontend: "My Groups" page (chats where the caller is a live admin, or
  every chat if bot admin/owner), a per-group settings form, a personal
  settings page.
- This is the first phase regular (non-bot-admin) users get real value
  from the panel, not just owners/bot admins — worth calling out as a
  milestone, not just another checkbox.

## Phase 5 — Feature-parity forms
*Effort: XL — the largest phase by raw surface area. Split into three
sub-phases below rather than one block, so partial progress still ships.
Dependencies: Phase 4.*

### 5a — Reminders, Alerts, Watches
- CRUD endpoints per `API.md`'s shapes.
- Frontend: a real date/time picker for reminder creation (the "when"
  payload shape was deliberately designed in `API.md` to mirror the
  wizard's own step data, so this form and the `/menu` wizard describe
  the same underlying moment two different ways — a native picker here,
  stepper buttons there) plus list/cancel views for all three modules.

### 5b — Group Administration actions
- Kick/ban/mute/unmute/pin/unpin/promote/demote/redact endpoints, each
  routed through the *exact* existing `auth.checkGroupAdminAccess`/
  `isOwnerOrSudoBotAdmin` functions — no reimplementation of the
  permission ladder in API-land.
- Frontend: a moderation panel per chat — target picker (search chat
  members), action buttons, no extra confirmation step for kick/ban
  (matches the existing "immediate like the command" convention), redact
  gets its four modes as a small form.

### 5c — Convert
- `POST /convert` multipart upload + synchronous conversion response.
- Frontend: file drop zone + target-format picker. The interactive
  multi-step `/convert` flow's UX doesn't need porting — a file picker
  plus a format dropdown *is* already the non-interactive one-shot shape.

## Phase 6 — Bot View
*Effort: L. Dependencies: Phase 0 (WebSocket infra), Phase 5b (chat
member/target lookups reused for "who am I sending to").*

- The in-memory pub/sub broadcaster tap on message recording, the
  per-chat WebSocket subscription endpoint, and the "send as bot"
  endpoint — see `ARCHITECTURE.md` §8 in full, since this is the most
  sensitive surface in the project and shouldn't be built casually.
- Resolve the two things `ARCHITECTURE.md` explicitly left open before
  writing a line of this phase's code: exact access tier (owner-only vs.
  bot-admin-inclusive), and whether every send needs an explicit
  confirmation step in the UI (recommended: yes, always, no "don't ask
  again" option — this is the one place in the whole panel where that
  friction is a feature).
- Frontend: a chat picker, a live message pane (incoming messages
  streaming in via the WS hook), a compose box for sending as the bot,
  visually distinguished (a persistent banner, not just a subtle color
  difference) from anything that looks like the admin's *own* identity
  speaking.

## Phase 7 — Hardening & polish
*Effort: M. Dependencies: everything above exists to harden.*

- Full audit log browsing UI (filter by action/account/date) on top of
  the `audit_log` table every prior phase has already been writing to.
- Rate limiting on the API layer (especially auth endpoints and Bot
  View's send endpoint).
- CSRF protection review for every state-changing endpoint (same-origin
  deployment per `ARCHITECTURE.md` §2 removes a lot of the usual risk,
  but double-submit-cookie or a custom header check is still cheap
  insurance).
- Optional but flagged explicitly: real JWKS/RS256 ID-token signature
  verification for OIDC logins, replacing the "trust the token endpoint's
  TLS channel" simplification from `ARCHITECTURE.md` §3.1 — needs a
  hand-rolled RSA-PKCS1v1.5 verify (`std.crypto` has no RSA), so budget
  real time for this one specifically if it's ever prioritized.
- Accessibility pass (Fluent UI React is decent out of the box here, but
  don't assume it for free — verify keyboard nav and screen-reader
  labeling on every custom composite component, e.g. the reminder
  date/time picker and Bot View's compose box).
- i18n/RTL groundwork (`ARCHITECTURE.md` §9) — at minimum, structure
  strings for extraction even if Persian translation itself isn't done
  yet.
- Production observability for the new API surface: request logging
  through the same `src/log.zig` tabular logger the bot already uses,
  not a second logging convention.

---

## Cross-cutting things every phase should check

- `zig build` **and** `zig build test`, both green, before calling any
  backend-touching phase done (see the reachability gotcha noted
  repeatedly above — it's worth repeating because it's easy to forget
  under a green `zig build test`).
- Every new mutating endpoint writes an `audit_log` row — not optional,
  not phase-specific, a standing rule from Phase 0 onward.
- Every permission check reuses an existing `auth.zig` function or the
  live `connector.isGroupAdmin` check — never a new parallel
  authorization path, the same principle `/menu` was already built on.
