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

## Phase 4.6 — Fluent 2 UI follow-up
*Effort: S. Dependencies: Phase 4.5. Status (2026-08-02): done. Inserted
the same way 4.5 was — Armin pushed a follow-up commit to the design
reference and asked for it ported, not originally planned.*

The design reference (github.com/mazoochian/warden-control-hub) gained a
new commit, "Updated to Fluent 2 UI" (`64f6ba0`), refining the mica-window/
WinUI-3 look Phase 4.5's port only partially had. Diff was genuinely small
— 4 files, ~160 lines — confirmed by fetching the reference repo directly
and diffing against the commit Phase 4.5 had ported.

- `brand-theme.ts`: renamed the corner-radius helper `sharpen` → `fluent2`
  and widened it to the real WinUI 3 scale (4px controls / 8px surfaces:
  `borderRadiusSmall` 3px, `Medium` 4px, `Large` 7px, `XLarge` 8px, plus
  `None`/`Circular`). New `micaLight`/`micaDark` (`#f3f3f3`/`#202020`,
  the window backdrop) and `layerLight`/`layerDark` (`#ffffff`/`#272727`,
  the content surface) exported constants.
- `AppShell`: `nav`/`topbar` are now transparent, floating directly on the
  `root` mica backdrop instead of being their own bordered/sticky
  surfaces; page content moved into a new `layer` wrapper div — a solid
  surface with only a top+left hairline stroke and a single
  `borderTopLeftRadius: borderRadiusXLarge` corner, the actual "curved
  container like newer Windows apps" look. Nav active-item indicator
  changed from a full-height inset bar to a short centered rounded pill;
  hover/pressed/selected colors moved to Fluent's `colorSubtleBackground*`
  token family instead of the brand-tinted one Phase 4.5 used.
- `ui-kit.tsx`: `StatTile`/`Section` (both built on Fluent's `<Card>`)
  gained an explicit 8px radius, hairline `colorNeutralStroke2` border,
  solid `colorNeutralBackground1` fill, and `boxShadow: none` — real
  "Fluent 2 card" treatment instead of relying on `Card`'s own default
  elevation.
- `globals.css`: the pre-hydration flash-prevention background (set by
  `data-theme` before `FluentProvider` mounts) now matches the new mica
  constants (`#f3f3f3`/`#202020`) instead of the old, unrelated
  `#ffffff`/`#292929` guess — the whole viewport sits on the mica backdrop
  outside of `AppShell`'s rounded layer, so this is the color that would
  otherwise flash.
- Verified with `npm run build` + `npm run lint` (both clean), plus an
  actual browser check this time (headless Chromium via Playwright,
  dev server + mocked `/api/v1/auth/session`/list endpoints since no
  backend was running) — screenshotted the Dashboard and Reminders pages
  in both themes, confirmed the rounded content-layer corner, restyled
  nav pill, and card-styled tiles/sections all render as intended, and
  confirmed dark mode via an actual toggle-button click (not just a
  `data-theme` attribute hack, which turned out to under-report — a real
  click reactively re-themes correctly).
- No functional/RBAC/session logic changed, same as Phase 4.5.

## Phase 5 — Feature-parity forms
*Effort: XL — the largest phase by raw surface area. Split into three
sub-phases below rather than one block, so partial progress still ships.
Dependencies: Phase 4.*

### 5a — Reminders, Alerts, Watches — done (2026-07-27)
- CRUD endpoints per `API.md`'s shapes: `GET/POST/DELETE` for
  `/api/v1/{reminders,alerts,watches}`. Identity-scoped by default (own
  items across every chat, not chat-scoped like the bot's own in-chat
  `/reminders`/`/alerts`/`/watches` commands — a deliberate difference,
  see `API.md`), `?chat_id=` narrows, `?identity_id=` (owner/bot_admin
  only) acts on behalf of someone else. Authorization mirrors the slash
  commands exactly (setter-or-owner to cancel a reminder/alert, any chat
  member to add/remove a watch).
- Frontend: a real date/time picker for reminder creation (native
  `<input type="date">`/`<input type="time">`, plus a duration mode) — the
  "when" payload shape mirrors the `/menu` wizard's own step data, so this
  form and the wizard describe the same underlying moment two different
  ways — a native picker here, stepper buttons there — plus list/create/
  cancel views for all three modules.
- Known gap, not fixed here: the chat picker in all three create forms
  reuses `useMyChats` (`?mine=true`, "chats I can *manage*"), so a regular
  member of a chat they don't administer can't yet pick that chat from
  this form, even though the backend's own `chat_members.isMember` check
  would allow the create. Pre-existing gap in the panel's chat-selection
  model (Groups has the same limit), not new to this phase — a real
  "chats I'm a member of" listing endpoint would need its own phase.

### 5b — Group Administration actions — done (2026-07-27)
- `POST /api/v1/chats/:id/actions/{kick,ban,mute,unmute,promote,demote,pin,
  unpin,redact}`, each routed through the *exact* existing
  `auth.checkGroupAdminAccess`/`isOwnerOrSudoBotAdmin` functions — no
  reimplementation of the permission ladder in API-land. `sudo_active` maps
  to plain bot-admin status (no `/sudo` text-prefix ritual in a web form;
  still sends the real "granted superuser permissions" chat message, so
  it's never silent) and the token-spend tier is never offered (API.md's
  own ladder only lists three tiers). `promote`/`demote` stay owner-only,
  matching `group_admin.promote`'s existing doc comment.
- Frontend: a moderation panel per chat — member table with inline action
  buttons, no extra confirmation step for kick/ban (matches the existing
  "immediate like the command" convention), redact gets its four modes as
  a small form.
- Caught and fixed a real crash during local smoke testing: every new
  handler read the request body before resolving auth, but cookie-reading
  needs the reader still in its pre-body state — an assertion failure, not
  just a wrong response. Also retrofitted Phase 5a: `reminders`/`alerts`/
  `watches` creation wasn't gated on its own module toggle like every
  slash-command equivalent is; fixed, list/cancel stay ungated (matches
  `/unwatch`'s "removal always allowed" precedent).
- Known gap, not fixed here: `pin` has no message-browser UI, just a typed-
  in native message id — the only place a chat's recent messages are
  exposed today (`GET /api/v1/admin/chats/:id`) is owner/bot-admin-only,
  while pin itself is open to any live platform admin too, so wiring it up
  would under-scope who can use it. Follow-up work, not a blocker.

### 5c — Convert — done (2026-07-27)
- `POST /api/v1/convert`: multipart upload (`file` + `target_format`) ->
  synchronous file download, calling `features/convert.zig`'s `convert()`
  directly — not chat-scoped at all, unlike every other Phase 5 endpoint,
  since it's a stateless utility with no persistence/chat side effects to
  authorize against. New `src/api/multipart.zig`, a small hand-rolled
  `multipart/form-data` parser (`std.http` has no built-in support for
  *receiving* uploads, only the outgoing builder other code already uses).
  Verified with a real image conversion through the local dev API, not
  just unit tests.
- Frontend: file drop zone + target-format picker, the dropdown filtered
  by a hand-mirrored copy of `convert.zig`'s extension/family tables
  (`src/lib/convertFormats.ts`) so it only ever offers combinations the
  server will accept. The interactive multi-step `/convert` flow's UX
  didn't need porting, as planned — a file picker plus a format dropdown
  already is the non-interactive one-shot shape.

**Phase 5 complete.** Next: Phase 7 (Hardening & polish) — see that
phase's own notes for what's still open before starting.

## Phase 6 — Bot View — done (2026-07-28)
*Effort: L. Dependencies: Phase 0 (WebSocket infra), Phase 5b (chat
member/target lookups reused for "who am I sending to").*

- New `src/api/bot_view.zig`: an in-memory `Broadcaster` (chat_id ->
  subscriber list, `Io.Mutex`+`Io.Condition`-guarded), fed by a read-only
  tap in `main.zig` right next to the existing `recordMessage` call for
  incoming (not choice-picked) messages — never influences whether/how a
  message gets answered. Scoped to *incoming* messages only, matching the
  "Live incoming view" naming literally; the bot's own automated replies
  don't re-appear in the pane (an accepted v1 limitation, not an oversight
  — see the module's doc comment).
- `GET /api/v1/bot-view/ws?chat_id=` — native `std.http.Server` WebSocket
  upgrade (confirmed present in this Zig toolchain). Per connection: the
  request's own worker thread becomes the "reader" (blocks on
  `readSmallMessage` purely to detect close), a second spawned thread is
  the "writer" (blocks on the subscriber's own `Io.Condition`, forwarding
  each published event as a JSON text frame) — deliberately real
  `std.Thread`s, not `Io.Group.async`/`Io.concurrent` (this codebase
  already moved off those for exactly this kind of long-lived
  per-connection work, see `worker_pool.zig`'s doc). Found and fixed a
  real bug while writing the integration test: `respondWebSocket` never
  flushes its own response, so without an explicit `ws.output.flush()`
  right after it, a client's handshake would hang until the chat's first
  published message instead of completing immediately.
- `POST /api/v1/bot-view/send` — `{chat_id, text}`, calls
  `connector.sendMessage` directly (no parallel send path), audit-logged
  as `bot_view.send` with the text as `detail_json`.
- Both endpoints resolved **owner-only**, not bot-admin-inclusive — the
  access-tier question `ARCHITECTURE.md` §7 had already resolved
  (2026-07-28) before this phase started. Confirmation is **always
  required** in the UI, no "don't ask again" option, per the same
  decision.
- Chat picker reuses the existing `GET /api/v1/chats?mine=true` rather
  than a new `/bot-view/chats` endpoint — owner already sees every chat
  there, which is exactly Bot View's own visibility rule; no gap.
- Frontend: chat picker, a live message pane (`useBotViewFeed`'s
  WebSocket hook, fixed 3s reconnect on drop, no replay), and a compose
  box with a persistent warning banner plus a confirmation dialog
  (showing the exact text and destination chat) gating every send — not
  just a color difference. The page itself also gates on
  `session.roles.owner` specifically (stricter than the sidebar's own
  admin-item grouping, which still shows the nav entry to bot admins too
  — the backend is the real boundary either way).
- Backend: `zig build` + `zig build test` both green, including a real
  end-to-end WebSocket test in `server.zig` — a raw TCP client doing its
  own RFC 6455 handshake (`std.http.Client` has no WS support) against
  the real accept loop, verifying both the owner-only gate and that a
  server-side `publish` actually arrives as a text frame.

## Phase 7 — Hardening & polish
*Effort: M. Dependencies: everything above exists to harden.*

- **Done (2026-07-28):** Full audit log browsing UI (`/admin/audit-log`)
  on top of the `audit_log` table every prior phase has already been
  writing to — action filter (server-side, exact match), account column,
  target/detail columns, cursor-based next/previous paging. No date-range
  filter (`audit_log.list` has no range query today, only `action` +
  cursor pagination) — client-visible "When" column covers browsing by
  eye at this project's scale; a real range filter is follow-up work if
  ever needed.
- **Done (2026-07-28):** Rate limiting on the API layer. New
  `src/api/rate_limit.zig` — a plain fixed-window counter per key (not
  sliding-window/token-bucket; some burstiness at a window boundary is an
  accepted tradeoff for "stop naive flooding," not "precise quota
  enforcement"). Applied to `POST /api/v1/auth/dev-login`,
  `GET /api/v1/auth/oidc/:id/{start,callback}` (20/min, keyed by a fixed
  per-endpoint string — no per-IP key yet, see below), and
  `POST /api/v1/bot-view/send` (10/min, keyed per-account — the
  precise, high-value one, since that endpoint is already authenticated).
  **Known gap, flagged not silently skipped:** true per-client-IP limiting
  needs the peer address plumbed from `server.zig`'s accept loop through
  every handler signature, which isn't done — the anonymous auth-flow
  endpoints are limited *globally per endpoint*, not per caller, until
  that plumbing exists (or until Traefik's own IP-based rate limiting is
  configured at the proxy layer instead, which may be the better fix
  given it's already sitting in front in production).
- **Reviewed, no change needed (2026-07-28):** CSRF. Every session cookie
  (`web_sessions`'s cookie, the OIDC PKCE flow cookie) is already
  `HttpOnly; Secure; SameSite=Lax` — under `SameSite=Lax`, a cross-site
  page's own `fetch`/`XHR`/form POST to warden's API does not carry the
  cookie at all in any current browser, which already defeats the
  standard CSRF attack shape for every state-changing endpoint (all of
  which are POST/PATCH/DELETE — confirmed no GET route performs a
  mutation). A double-submit-cookie/custom-header scheme would be
  redundant defense-in-depth for real implementation cost (threading a
  token through every mutating frontend call) given `SameSite=Lax`
  already covers the realistic threat model for a same-origin deployment
  — deliberately not added.
- **Done (2026-07-28):** Production observability for the new API
  surface — one line per request (`method path outcome elapsed_ms`)
  through the same `src/log.zig` tabular logger every other subsystem
  uses, added to `server.zig`'s `handleConnection`. Individual handlers'
  own `log.err`/`log.warn` calls (already scattered through `router.zig`)
  stay as the *why* on failure; this is just the *that a request
  happened at all* line, which didn't exist at any level before.
- **Adjusted, not re-attempted:** the RS256/JWKS item below was written
  before Phase 3's OIDC work landed and assumed RS256 specifically —
  `oidc.zig` already does real JWKS-based signature verification, just
  over ES256 (the objectively correct call given `std.crypto` has no RSA
  at all, not a shortcut) with the signing provider (Telegram) switched
  to ES256 via BotFather. Real RS256 support would still need a
  hand-rolled RSA-PKCS1v1.5 verify if a *future* provider requires it
  specifically; not needed for anything in production today.
- **Done (2026-08-02):** Accessibility pass across every custom composite
  component in the app (Fluent primitives used as-is were left alone —
  confirmed via `@fluentui/react-field`'s source that `Dropdown`/`Input`/
  `Textarea`/`Switch` already pick up a wrapping `<Field label>`'s
  `aria-labelledby` through React context automatically, so those didn't
  need touching; only genuinely custom compositions and controls with no
  `Field` ancestor at all did).
  - New `ToggleButtonGroup` (`src/components/ui-kit.tsx`) replaces the
    hand-rolled "row of `Button`s, `appearance` swapped for the selected
    one" pattern that five different pages had each independently
    reinvented — visually a Button toggle showed which option was
    selected, but nothing told a screen reader, and the group of buttons
    had no collective name. Uses the "pressed toggle button" ARIA pattern
    (`aria-pressed` per button inside a labeled `role="group"`), not
    `radiogroup`/`radio` — these stay individually Tab-reachable, and
    `radiogroup` would promise arrow-key navigation this doesn't
    implement. Adopted in `reminders/page.tsx` (when-mode), `alerts/page.tsx`
    (condition), `moderation/page.tsx` (redact mode), `groups/[id]/page.tsx`
    (thinking display), `settings/page.tsx` (date/time format).
  - New `clickableRowProps()` (`ui-kit.tsx`) fixes a real keyboard-trap-
    adjacent bug: `admin/chats/page.tsx`, `admin/identities/page.tsx`, and
    `groups/page.tsx` each had a `TableRow` with a bare `onClick` that
    navigated to a detail page — mouse-only, no keyboard equivalent at
    all, no affordance telling assistive tech the row did anything. Now
    `role="button"` + `tabIndex={0}` + Enter/Space `onKeyDown`. Trades away
    the row's native `row`/`gridcell` semantics for its cells (a real,
    accepted cost) in exchange for being reachable at all.
  - Convert page's (`convert/page.tsx`) drag-and-drop zone was a plain
    `<div onClick>` — entirely unreachable by keyboard, since the file
    `<input>` it triggered was `display: none` and never itself focusable.
    Now `role="button"`, `tabIndex={0}`, `onKeyDown` (Enter/Space opens the
    file picker), and a state-reflecting `aria-label`; the hidden input
    got `tabIndex={-1}`/`aria-hidden` since the wrapping div is the real
    control now.
  - Explicit `aria-label`s added to controls that had **no** accessible
    name at all (not wrapped in `Field`, no visible `<label>`, placeholder-
    only): Bot View's compose `Textarea` and chat `Dropdown`
    (`bot-view/page.tsx`); Moderation's chat `Dropdown` and member
    `SearchBox` (`moderation/page.tsx`); Admin Modules' per-module `Switch`
    (`admin/modules/page.tsx` — the visible label `Text` next to it was
    never programmatically associated); Admin Config's per-setting `Input`
    (`admin/config/page.tsx`); the `SearchBox`es on Admin Chats/Identities
    and the action filter `Input` on Admin Audit Log; Reminders' native
    `<input type="date">`/`<input type="time">` and its duration/repeat
    `Input`/`Dropdown` pairs (`reminders/page.tsx`) — none of these had an
    accessible name before, placeholder text isn't a reliable substitute.
  - Reviewed, left alone (already correct): Bot View's send-confirmation
    `Dialog` (Fluent handles focus trap, Escape-to-close, and focus
    restore on close natively), `AppShell`'s collapsed-nav `Tooltip
    relationship="label"` pattern, the nav category-expand buttons (native
    `<button>` + `aria-expanded`), `ThemeToggle` (already had `aria-label`
    + `title`).
  - Verified with `npm run build` + `npm run lint` (both clean) and a
    keyboard-nav reasoning pass over every diff above (tab order, Enter/
    Space activation) rather than a screenshot — a screenshot can't show
    tab order or ARIA state, reasoning through the actual markup/handlers
    is the only thing that actually proves this class of fix.
- **Done (2026-08-02), partial by design:** i18n/RTL groundwork
  (`ARCHITECTURE.md` §9). No i18n framework dependency added (nothing in
  `package.json` already pulled one in, and the app doesn't need per-route
  bundles or ICU plural rules at this scale) — new `src/lib/i18n/en.ts`
  (a flat, page-scoped `key -> English string` table) and
  `src/lib/i18n/index.ts` (`t(key, values?)` lookup with `{{placeholder}}`
  interpolation). A future `fa.ts` (or any other locale) is "write an
  object satisfying `Record<I18nKey, string>` — a missing key is a
  compile error via `satisfies`, not a silent runtime fallback" — see that
  file's own doc comment for exactly what wiring a second locale in would
  still need (a locale-selection context, not built here).
  - **Converted to `t()`:** `src/components/AppShell.tsx` (every nav
    label, brand text, group labels, collapse/expand, log out), the login
    page, the dashboard page, and the Reminders/Alerts/Watches pages
    (title, description, every field label, every button/table-header/
    empty-state string) — the highest-traffic surfaces, per the original
    ask.
  - **Not converted, flagged not silently dropped:** every admin page
    (Chats/Identities/Modules/Config/Audit Log directories and detail
    views), Moderation, Bot View, Convert, Groups (list + per-group
    settings), Personal Settings, and Account & Sessions — all still plain
    hardcoded English strings. Picking these up later is mechanical (the
    same `t("page.key")` substitution already done six times over), just
    not attempted here to keep this pass to a bounded, real subset rather
    than touching every `.tsx` file in one sweep.
  - **Follow-up (2026-08-02), later same day:** converted Moderation
    (`moderation/page.tsx`), Convert (`convert/page.tsx`), Groups both list
    and per-group settings (`groups/page.tsx`, `groups/[id]/page.tsx` —
    the latter under a new `groupSettings.*` key namespace since it's a
    separate file from the list page), Personal Settings
    (`settings/page.tsx`), Account & Sessions (`account/page.tsx`), and
    Notes (`notes/page.tsx`, added same day in Phase 8 below, so it had
    never gone through a conversion pass at all) — same mechanical
    `t("page.key")` substitution, no new i18n infrastructure. One real fix
    needed along the way: `convert/page.tsx` had a local `targets.map((t)
    => ...)` loop variable shadowing the imported `t()` function; renamed
    to `fmt`. Pluralized strings (group/session counts) stay two flat keys
    picked in code (`*.countOne`/`*.countOther`,
    `*.sessionCountOne`/`*.sessionCountOther`) rather than real plural
    rules, consistent with this module's "no ICU, not at this scale"
    stance. Verified: `npm run lint` and `npm run build` both clean.
  - **Follow-up (2026-08-02), same day, closing the list out:** converted
    every remaining admin page — Chats (`admin/chats/page.tsx` +
    `admin/chats/[id]/page.tsx`), Users (`admin/identities/page.tsx` +
    `admin/identities/[id]/page.tsx`), Modules (`admin/modules/page.tsx`),
    Config (`admin/config/page.tsx`), Audit Log
    (`admin/audit-log/page.tsx`) — and Bot View (`bot-view/page.tsx`).
    Same mechanical `t("page.key")` substitution as every prior pass, new
    `adminChats.*`/`adminChatDetail.*`/`adminIdentities.*`/
    `adminIdentityDetail.*`/`adminModules.*`/`adminConfig.*`/
    `adminAuditLog.*`/`botView.*` namespaces in `en.ts`. Bot View's
    confirmation-dialog sentence ("This will be posted in **{chat}**...")
    dropped the inline bold emphasis on the chat name — `t()`'s
    `{{placeholder}}` interpolation is plain-text-only, no embedded markup,
    same limitation every other placeholder string in this table already
    has, so this just makes that one page consistent with the rest rather
    than reaching for something new. **Every page in the app is now
    converted**; RTL groundwork (`dir` wiring + the logical-CSS-properties
    migration) is done too as of the same day — see below. Verified:
    `npm run lint` and `npm run build` both clean.
  - **RTL groundwork — done (2026-08-02)**, closing out the map above:
    every spot it named converted to logical CSS properties —
    `AppShell.tsx`'s nav active-item accent pill (`left` →
    `insetInlineStart`), sub-nav indent (`paddingLeft` →
    `paddingInlineStart`), and the content `layer`'s hairline stroke +
    rounded corner (`shorthands.borderLeft`/`borderTopLeftRadius` →
    `borderInlineStartWidth`/`Style`/`Color` longhands +
    `borderStartStartRadius` — Griffel's own types ban the
    `borderInlineStart` shorthand, longhands are required);
    `ui-kit.tsx`'s `accentBar` helper (same longhand treatment);
    `bot-view/page.tsx`'s live-feed scroll padding (`paddingRight` →
    `paddingInlineEnd`); and the `marginLeft`/`marginRight` Badge styles
    in `account/page.tsx`/`admin/config/page.tsx` (→
    `marginInlineStart`, badge follows text) and
    `admin/identities/page.tsx` (→ `marginInlineEnd`, badge precedes
    another badge). Also new: `src/lib/i18n/index.ts` exports `locale`
    (hardcoded `"en"` for now) and a `dir: "ltr" | "rtl"` derived from it
    via the same `fa`/`fa-IR` heuristic `user_settings.zig` already uses
    server-side, threaded into `FluentProvider`'s `dir` prop
    (`app/providers.tsx`) and the root `<html>` element's `dir`/`lang`
    attributes (`app/layout.tsx`) so both Fluent's RTL styling and native
    browser chrome (scrollbars, form controls) would follow a real RTL
    locale once one exists. **Still open, deliberately not attempted
    here**: an actual second locale (a `fa.ts` strings table) and any
    locale-switcher UI — `dir` only ever resolves to `"ltr"` today, so
    none of this is exercised end-to-end yet, it's groundwork the next
    real locale can build on without a CSS rewrite. Verified: `npm run
    lint` and `npm run build` both clean; visually identical in the
    default English/ltr case, as expected for a groundwork-only pass.

## Phase 8 — Notes (feature parity)
*Effort: S. Dependencies: Phase 5a (same identity-scoped-list pattern).
Status: done (2026-08-02). Not originally planned — added reactively once
warden's own `ROADMAP.md` Phase 11 ("personal knowledge base: notes &
lists") shipped bot-side (`/note` commands, `set_note` LLM tool) with no
web API or frontend of its own, the same "zero frontend story" gap Phase
5a closed for Reminders/Alerts/Watches.*

- warden's Phase 11 landed with no `API.md`/`router.zig` work in scope at
  all — checking `src/api/router.zig` there directly confirmed no
  `/api/v1/notes` route existed before this phase. Added it there as part
  of this same pass (a warden-repo change, not a warden-ui one): new
  `GET`/`POST`/`DELETE /api/v1/notes`, identity-scoped by default across
  every chat like Reminders/Alerts/Watches, reusing the exact same
  `requireLoggedIn`/`resolveListIdentity`/`resolveCreateIdentity` helpers
  those three already built rather than a new auth path. New
  `notes.NoteForIdentity`/`notes.listForIdentity` in warden's
  `store/notes.zig` (the original Phase 11 pass only needed the
  chat-scoped `listForChat` the bot's own `/notes` command uses). Delete
  authorization mirrors `/note delete` exactly (creator or bot owner) —
  deliberately not Watches' looser "anyone currently in the chat" removal
  model. Also registered `notes` in `feature_flags.known_modules`, which
  Phase 11 had left off despite `main.zig` already gating `/note`/
  `set_note` against that exact key — the toggle silently never appeared
  on `/admin/modules` until this. See warden's own `ROADMAP.md` Phase 11
  entry and `API.md`'s "Feature parity" section here for the full
  writeup.
- Frontend: `src/app/(dashboard)/notes/page.tsx` (list/create/delete),
  `src/hooks/useNotes.ts`, an `AppShell` nav entry between Watches and
  Convert — modeled closest on the Watches page (simplest of the three
  Phase 5a forms: one chat picker plus one field, no date/time or
  kind/condition sub-forms), except the note-text field is a `Textarea`
  (up to 1000 bytes, mirroring `/note add`'s own cap) rather than a
  single-line `Input`, since a note or list entry is realistically longer
  than a feed URL.
- **Not done, deliberately out of scope for this pass**: i18n extraction
  for the new page (Phase 7's `t()` conversion covered Reminders/Alerts/
  Watches specifically as an already-bounded pass before this page
  existed; Notes joins the same "not yet converted" list as Moderation/
  Convert/Groups/Settings/Account) and RTL — no new hardcoded `left`/
  `right` CSS was introduced by this phase, so Phase 7's existing RTL
  note doesn't need updating.
- Verified: warden side, `zig build` and `zig build test` both green
  (checked in an isolated `git worktree`, not the live checkout — see
  warden's own `ROADMAP.md` Phase 11 entry for why: an unrelated,
  uncommitted, in-progress Phase 12 pass was sitting in that working tree
  and breaks every DB-touching test locally, for reasons unrelated to
  this phase). warden-ui side, `npm run build` and `npm run lint` both
  clean in the normal checkout (no interference — the Phase 12 work only
  exists in the warden repo).

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
