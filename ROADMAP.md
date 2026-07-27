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
there); **Phase 1's shell is done and Telegram Login is done
end-to-end** (needs one external `@BotFather` step from Armin before
it'll actually authenticate anyone — see Phase 1's own status line).
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
master); Telegram Login done end-to-end (2026-07-28, backend on
`feature/api-server`, frontend on master) except one external step (see
below). Google/OIDC login, account linking, and the session-list UI are
still ahead.*

- ~~warden-ui repo gets its actual scaffolding~~ Done: Next.js (App
  Router) + TypeScript + `@fluentui/react-components`, `FluentProvider`
  wired for light/dark (a theme toggle, persisted per-browser, with a
  blocking inline script avoiding a flash of the wrong theme), TanStack
  Query installed and ready for Phase 2. Every dashboard route exists as
  a real page today (most render a `PlaceholderPage` naming which phase
  builds them); the nav nesting (Modules/Admin categories) matches this
  roadmap's own module list.
- ~~Telegram Login Widget~~ Done (2026-07-28): `src/api/telegram_login.zig`
  (HMAC verification, full test coverage), `GET /api/v1/auth/providers` +
  `POST /api/v1/auth/telegram/callback` in `router.zig`, and a real
  `TelegramLoginButton` component wired into the login page. **Correction
  to this line's original wording**: it turns out this method *does* need
  one external, one-time setup step after all — Telegram requires the
  bot's serving domain to be registered via `@BotFather`'s `/setdomain`
  command before the widget will actually authenticate anyone (it renders
  fine either way, just silently refuses to call back without this). Not
  code-blocking, but needs Armin to do it against the real deployed
  domain once one exists — flagged, not done here.
- Google OAuth2 code-flow login (needs a Google Cloud OAuth client
  registered — an external setup step, not just code).
- Generic OIDC login against an admin-configured `oauth_providers` row
  (needs at least one real IdP to test against — Authentik/Keycloak in a
  throwaway dev container is enough, doesn't need to be the same one
  used in production).
- Account linking flow (`ARCHITECTURE.md` §3.3): "add another login
  method" from an account settings page.
- ~~Basic app shell: nav, the account menu, session list (`/me/sessions`)
  with per-session revoke, logout.~~ Done (2026-07-28): `/account` page,
  `GET`/`DELETE /api/v1/me/sessions`.
- The two open questions that used to block later phases (Bot View's
  access tier, ownership-transfer scope) are now decided — see
  `ARCHITECTURE.md` §11 — so this phase's own scope is unchanged, just no
  longer waiting on anything.
- Google OAuth2, generic OIDC, and account linking remain **not started**
  — all three need external setup (a registered OAuth client, a real IdP
  to test against) that's Armin's to do, not a code task on its own.

## Phase 2 — Read-only admin dashboard
*Effort: M. Dependencies: Phase 1. Status: done (2026-07-28), on top of
Telegram-Login-only auth (Google/OIDC not required for this phase --
`roles: {owner, bot_admin}` only needs *a* logged-in account, not a
specific login method).*

The first phase where the panel actually shows something worth logging
in for, deliberately read-only (lowest risk, fastest to real value).

- ~~`GET /admin/stats/overview`, `/admin/chats`, `/admin/identities` and
  their detail views~~ Done: new `store/admin_directory.zig` (didn't reuse
  `store/stats.zig` after all — that module's queries are chat-scoped
  message-count/top-users, a different shape than the bot-wide
  overview/directory queries this phase needed; `stats.zig` is untouched).
- ~~Frontend: dashboard home (overview tiles), a chats directory + detail
  page, a users directory + detail page — all read-only, RBAC-gated to
  bot admin/owner per `ARCHITECTURE.md` §7.~~ Done, including nav-level
  RBAC (the whole Admin nav category is hidden for non-admins, backend
  still enforces regardless — hiding is UX only, not the security
  boundary).
- **Not done**: growth-over-time / any real chart. The `dataviz` skill
  guidance was skipped for this pass since everything shipped is plain
  number tiles and tables, not a chart — worth revisiting once a real
  time-series view (e.g. messages-per-day) gets built.
- **Not done**: real pagination UI. `listChats`/`listIdentities` support
  cursor pagination server-side (`next_cursor` in the response), but the
  frontend just requests `limit=200` and shows everything in one page —
  fine for a single bot's realistic scale today, not built out further
  since nothing has needed it yet (see `useAdminDirectory.ts`).
- **New this pass, not originally scoped**: `GET /api/v1/auth/session`
  now returns `roles: {owner, bot_admin}` (§`API.md`), needed to gate
  everything above. This was explicitly deferred in Phase 1 pending "an
  RBAC-gated page actually needs it" — this phase is that page.

## Phase 3 — Module toggles + dynamic config panel
*Effort: M (was M, ended up slightly larger — see the provider hot-swap
item below). Dependencies: Phase 0 (feature_flags/dynamic_config tables),
Phase 2 (dashboard shell to hang this off of). Status (2026-07-28):
**done** — every item below shipped, verified against a real DB
end-to-end (413→422 tests across the phase's commits, 0 leaks, only the
two known pre-existing flakes ever seen).*

- ~~Wire `feature_flags` reads into every module's dispatch branch in
  `main.zig` (standalone commands) and into `tools/registry.zig`'s list
  construction (LLM-tool-shaped features)~~ Done — see `ARCHITECTURE.md`
  §5's "Implemented 2026-07-28" note for the two policy calls made along
  the way (gate mutation not viewing; LLM-tool natural-language
  equivalents share their standalone module's key) and exactly what
  `group_admin` covers. New `GET`/`PATCH /api/v1/admin/modules` (API.md),
  gated by the same `requireAdmin` Phase 2 introduced, writes `audit_log`.
- ~~Wire `dynamic_config` reads into the handful of currently-env-only
  fields identified as safe in `ARCHITECTURE.md` §6's table~~ Done for
  the 8 that checking actual read sites confirmed are genuinely live
  (`resolveLlmDynamicSettings` bulk-fetches the 6 LLM-turn ones in one
  query rather than six round trips) — pool size/worker counts/confirm-
  convert-menu timeouts turned out to be startup-only despite the
  original table implying otherwise; corrected in `ARCHITECTURE.md` §6
  rather than wired live, since that needs those structures reworked,
  not just a DB read. New `GET`/`PATCH /api/v1/admin/config` (masked
  secrets read live from `Config`, never touching `dynamic_config`).
- ~~Decided 2026-07-28 (Armin): `WARDEN_LLM_PROVIDER` becomes
  hot-swappable here too, not just the model~~ Done (2026-07-28,
  deliberately saved for last as the riskiest item — touches the core LLM
  call path). Turned out to need more than "re-resolve per call": `Config`
  only ever loaded the *selected* provider's env vars, so the other one's
  credentials never existed to swap to at all — `config.zig` now loads
  both independently (same error semantics as before when only one is
  configured). New `llm/dynamic_provider.zig` wraps both behind one
  `llm.Provider`, re-checking `dynamic_config` per call, falling back to
  whichever is actually configured if the requested one isn't. See
  `ARCHITECTURE.md` §6's "Provider selection" row for the full picture —
  and its new adjacent "Model selection" row for a correction found along
  the way: model selection (`WARDEN_ANTHROPIC_MODEL`/`WARDEN_OPENAI_MODEL`)
  is *not* actually live either, despite this file's original wording
  implying it was — deliberately not fixed in this pass, since doing so
  touches the actual request-building code in `llm/anthropic.zig`/
  `llm/openai_compat.zig`, not just `main.zig`/a new wrapper file.
- ~~Frontend: a modules page (toggle switches...) and a config page
  (grouped by category, secrets rendered masked and non-interactive)~~
  Done — `/admin/modules` (Commands vs. LLM tools grouping),
  `/admin/config` (live settings with inline save, masked secrets
  section), both ending in a `RecentChanges` widget.
- ~~Every toggle/change writes to `audit_log`... surface *some* of that
  trail on this same page~~ Done — new `GET /api/v1/admin/audit-log`
  (thin wrapper over the Phase-0-built `audit_log.list`, never exposed
  over HTTP until now), called once per action and merged client-side.

## Phase 4 — Per-chat group settings (group-admin-facing)
*Effort: M. Dependencies: Phase 1 (RBAC/session), Phase 2 (chat directory
to select from). Status (2026-07-28): **done**.*

- ~~`GET`/`PATCH /chats/:id/settings` (persona, magic word, digest,
  thinking override) — same store functions the slash commands already
  call, gated by the live `connector.isGroupAdmin` check~~ Done —
  `ServerContext` had zero connector access before this phase (only
  needed DB access until now); gained `connectors: []const iface.Connector`
  so `requireChatAccess`/`isLiveAdminOfChat` can make that live check.
  Also shipped `GET /api/v1/chats?mine=true` and `GET
  /api/v1/chats/:id/members` (API.md's other two Groups endpoints),
  neither of which had its own bullet here but both were needed for the
  frontend to be useful at all.
- ~~`GET`/`PATCH /me/settings` (personal reminder timezone/date/time
  format)~~ Done — genuinely was pure UI on top of already-complete
  backend logic, as predicted.
- ~~Frontend: "My Groups" page..., a per-group settings form, a personal
  settings page~~ Done — `/groups` (list), `/groups/[id]` (settings form +
  member list), `/settings` (personal). Both settings forms needed a
  small deviation from the obvious "useEffect to seed state from loaded
  data" pattern — the newer `react-hooks` lint rule flags synchronous
  `setState` inside an effect, fixed by seeding a keyed child component's
  `useState` directly from the loaded data instead.
- This is the first phase regular (non-bot-admin) users get real value
  from the panel, not just owners/bot admins — worth calling out as a
  milestone, not just another checkbox.

## Phase 4.5 — Panel design refresh
*Effort: M. Dependencies: Phase 4 (every real page that exists so far).
Status (2026-07-28): done. Inserted between Phase 4 and Phase 5 at
Armin's request, not originally planned.*

Armin built a separate visual design reference while this app was being
developed — github.com/mazoochian/warden-control-hub, a Lovable-generated
prototype (mock data, no real backend). Turned out to independently use
the exact same stack this app already does (Fluent UI React v9, same
version) with a custom brand theme and a small shared component kit, just
more polished — porting it in was a restyle, not a framework swap or a
rewrite.

- `brand-theme.ts`: saturated teal-cyan brand ramp + sharpened corners
  (2/3/4/6px radii), replacing the stock `webLightTheme`/`webDarkTheme`.
- `ui-kit.tsx`: shared `PageHeader`/`StatTile`/`Section`/`PlatformBadge`/
  `EmptyState` + `useCommonStyles`, adopted across every real page instead
  of each one inventing its own spacing/card conventions.
- `AppShell`: collapsible grouped sidebar (Modules/Admin sections,
  localStorage-persisted), active-item accent bar + filled/regular icon
  swap, sticky topbar with the current section label + account menu.
- Login page, and every real page built so far (Dashboard, Account &
  Sessions, Admin Chats/Users + detail, Admin Modules, Admin Config, My
  Groups + detail, Personal Settings) rebuilt on the new kit. Dashboard
  also gained two sections the old version didn't have ("Busiest chats",
  "Recent panel activity") since the reference had them and the data was
  already available.
- Every remaining `PlaceholderPage` stub (Alerts, Bot View, Convert,
  Moderation, Reminders, Watches, Audit Log) restyled too, so the whole
  app looks consistent even where the underlying feature isn't built yet.
- No functional/RBAC/session logic changed anywhere — this was a visual
  pass on top of everything already working, verified the same way as
  every other phase (`npm run build` + `npm run lint` clean throughout).

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
