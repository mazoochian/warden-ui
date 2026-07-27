# warden-ui — Architecture & Decisions

This document is the "why," not the "when" (see `ROADMAP.md` for phasing)
or the "what exactly" (see `API.md` for the endpoint contract). Every
non-obvious choice below is written down with its reasoning so a future
session doesn't have to re-derive it — same convention warden's own doc
comments already follow.

## 1. System shape

```
                         ┌────────────────────────────┐
  Telegram/Matrix/XMPP ──┤                            │
                         │        warden (Zig)        │
                         │  - existing bot logic       │
  Browser ── HTTPS ──────┤  - NEW: HTTP+WS API server  │── Postgres (shared)
  (warden-ui, Next.js)   │    (same process, same      │
                         │     Postgres pool, same     │
                         │     permission checks)      │
                         └────────────────────────────┘
```

**warden itself grows the API. There is no second backend.** This was an
explicit requirement, not just a default: warden-ui talks to warden's new
HTTP/WebSocket endpoints, which run in the same process as the bot,
share the same `PgPool`, the same `Config`, and — critically — the same
`auth.zig` permission checks the bot already enforces for every command.
A button in warden-ui and a slash command hit the literal same handler
functions, the same way `/menu`'s `ActionRunner` already does today (see
warden's own `menu.zig` module doc comment: "the menu is a thin UI layer
over existing commands, never a parallel permission system" — the API is
a third such thin layer, not an exception to that rule).

**Why this is tractable in Zig despite no web framework ecosystem**:
confirmed the Zig 0.16 toolchain warden already uses ships `std.http.Server`
with first-class WebSocket upgrade support (`Request.respondWebSocket`,
`WebSocket.readSmallMessage`/`writeMessage`) — the hard part (HTTP/1.1
parsing, the WS handshake/framing) is already solved. What's left to build
is routing, JSON (de)serialization (`std.json` is in stdlib), session
auth, and a connection-accept loop — a real chunk of work (see
`ROADMAP.md` Phase 0), but not "implement HTTP from raw sockets."

## 2. Two repos, one deploy unit (mostly)

- **warden** (this session's existing repo) gains the API. Still builds to
  one binary, one Docker image, deployed exactly as it is today.
- **warden-ui** (new repo, `/home/armin/claude/warden-ui`) is a Next.js +
  TypeScript app, its own Docker image, its own deploy.
- Both run as separate services in the *same* `docker-compose` stack on
  the existing VPS (mzn-warden), fronted by a reverse proxy (recommending
  **Caddy** — not currently in the stack — for automatic HTTPS and a
  Caddyfile simple enough not to become its own maintenance burden; nginx
  works too if there's an existing preference, this is a swappable
  choice). The proxy routes `/api/*` (and the WebSocket upgrade paths) to
  warden's new API port, everything else to the Next.js app, under one
  public domain.
- **Same-origin by design**: routing both through one reverse-proxied
  domain means the session cookie is first-party and `SameSite=Lax`
  works cleanly — no CORS configuration, no cross-site cookie flags, no
  "which origin is the API on" question for the browser. This was a
  direct consequence of picking "same VPS, reverse-proxied" over a split
  Vercel+VPS deployment.

## 3. Auth model

### 3.1 Login methods

- **Telegram Login Widget** — not OIDC, its own well-documented flow:
  Telegram posts back a signed payload (`id`, `first_name`, `username`,
  `photo_url`, `auth_date`, `hash`); we verify `hash` ourselves via
  HMAC-SHA256 using `SHA256(bot_token)` as the key over the sorted
  `key=value` fields (Telegram's documented algorithm) — `std.crypto`
  already has both SHA-256 and HMAC, so this needs zero new crypto
  primitives.
- **Google login** and **generic OIDC** (admin-configured issuer/client
  id/secret — Authentik, Keycloak, Zitadel, Auth0, whatever the admin
  already runs or stands up) — both handled as plain **OAuth2
  authorization-code flow**, not full OIDC-with-local-signature-verification:
  1. Redirect to the provider's `/authorize`.
  2. Exchange the returned `code` for tokens **server-to-server** over
     TLS, directly against the provider's token endpoint (warden already
     has an HTTP client for exactly this shape of call).
  3. Call the provider's `/userinfo` endpoint (or equivalent claims
     endpoint) with the access token to get the verified profile
     (`sub`, `email`, `name`, `picture`) directly from the source, rather
     than parsing/verifying the `id_token` JWT ourselves.

  **Why skip local ID-token signature verification**: doing it properly
  needs RSA (RS256 is the overwhelmingly common OIDC signing algorithm)
  and `std.crypto` has no RSA implementation (it does have `ecdsa.zig`,
  which covers ES256-signing providers, but not the common case).
  Implementing RSA-PKCS1v1.5 verification by hand is a real, non-trivial
  crypto-adjacent undertaking with real failure-mode risk if gotten
  subtly wrong. Fetching claims from `/userinfo` over the same
  TLS-authenticated channel the code exchange already used is a
  legitimate, widely-used simplification (we trust the transport, not a
  detached signature) — flagged here explicitly as a **documented,
  deliberate scope cut**, with "add real JWKS+RS256 verification" called
  out as a future hardening item in `ROADMAP.md`'s Phase 7, not a silent
  gap.

- warden-ui never talks to these providers directly from the browser for
  anything sensitive beyond the initial redirect — the code exchange and
  claims fetch happen server-side, in warden's new API, so client secrets
  never reach client-side JS.

### 3.2 Our own session tokens

Once any login method resolves to a verified identity, warden mints its
**own** session — an opaque, HMAC-SHA256-signed token (not a JWT; no need
for the format's complexity when we're both issuer and sole verifier),
stored as an `httpOnly`, `Secure`, `SameSite=Lax` cookie. The token
contains a session id; the actual session record (identity, issued-at,
expires-at, revoked-at, user agent, IP) lives in a new DB table
(`web_sessions` — see §4) so a session can be **revoked server-side**
("log out everywhere," force-expire on a permission downgrade) — a
stateless-JWT-only design can't do that without a separate revocation
list anyway, so a DB-backed session was simpler *and* more capable, not a
tradeoff.

### 3.3 Account linking — the identities/accounts split

warden already has an `identities` table keyed by `(platform, native_id)`
— one row per real person *per platform* (a Telegram user and their
hypothetical Matrix account are two separate rows today, deliberately,
since the bot has no way to know they're the same person unless told).

The web login methods add platforms the bot has never dealt with before
(`google`, `oidc:<issuer>`, and `telegram` — reusable directly, see
below). Two options were considered:

- **(Rejected) Force everything through the existing `identities` table**,
  adding `platform = 'google'` rows etc. Clean at first, but breaks the
  moment someone wants their web login to be recognized as *the same
  person* as their existing Telegram identity (which is the common,
  expected case — most admins already talk to the bot via Telegram and
  just want a browser view of the same account). `identities` has no
  concept of "these two rows are the same human."
- **(Chosen) A new `accounts` table represents "one browser-facing
  person," with `account_identities` linking it to one or more
  `identities` rows.** Logging in via the Telegram Login Widget resolves
  *directly* to the bot's existing `identities` row for that Telegram
  user id (no linking step needed — this is the expected common path,
  and it's why Telegram Login is listed first among login methods
  everywhere in this plan). Logging in via Google/OIDC for the first time
  creates a fresh `identities` row (`platform = 'google'` or
  `platform = 'oidc:<issuer-host>'`) plus a fresh `accounts` row. A
  logged-in user can then explicitly **link** another login method from
  their account settings, which adds another `account_identities` row
  instead of creating a second account — from then on, logging in via
  either method resolves to the same `accounts` row.
- Every permission check (owner, bot admin, per-chat live admin) still
  reads from the underlying `identities`/`bot_admins`/`chat_members`
  tables exactly as it does today — an account's *effective* permission
  is the union across every `identities` row linked to it. No existing
  bot-side authorization code changes meaning; the web layer just adds
  one more table to resolve "which identity/identities does this browser
  session represent."

## 4. New data model (all in the same Postgres database warden already uses)

New tables, added as new numbered migrations in warden's own
`store/migrations/` (migration 16 onward) — no second database, no sync
problem, no dual-write risk:

- **`accounts`** — `id`, `created_at`, `display_name` (denormalized
  convenience, taken from whichever identity logged in first),
  `avatar_url`.
- **`account_identities`** — `account_id`, `identity_id` (PK on the pair;
  unique on `identity_id` alone — one identity belongs to at most one
  account).
- **`web_sessions`** — `id` (the opaque token references this), `account_id`,
  `created_at`, `expires_at`, `revoked_at`, `user_agent`, `ip`.
- **`oauth_providers`** (admin-configured generic-OIDC providers — the
  "any OIDC IdP" case needs somewhere to store issuer URL/client
  id/client secret per provider, since unlike Google this isn't a single
  well-known endpoint) — `id`, `name` (shown on the login screen),
  `issuer_url`, `client_id`, `client_secret` (server-side only, never
  serialized to the API), `enabled`.
- **`feature_flags`** — `module` (PK, e.g. `'reminders'`, `'alerts'`,
  `'watches'`, `'convert'`, `'group_admin'`, `'stats'`, `'persona'`,
  `'digest'`, `'voice_transcription'`, `'web_search'`, `'weather'`,
  `'crypto_prices'`, `'air_quality'`, `'qr_code'`, `'dictionary'`,
  `'hackernews'`, `'site_scraping'`, `'menu'`), `enabled`, `updated_at`,
  `updated_by` (→ `identities.id`, for the audit trail). **No seed
  rows** — a missing row means enabled (same missing-row-means-default
  convention as `dynamic_config` below), checked in application code
  (`store/feature_flags.zig`'s `isEnabled`), not via migration-time
  `INSERT`s. This was a deliberate revision from the original plan: a
  one-time seed `INSERT` would get permanently wiped the first time a
  test's `TRUNCATE ... CASCADE` (via `updated_by`'s FK to `identities`)
  ran, since an already-applied migration never re-runs its `INSERT` —
  caught while implementing Phase 0, see the commit that added this
  table.
- **`dynamic_config`** — the DB-backed subset of today's env-only
  `Config` fields that are safe to expose as live-editable (see §5's
  table for exactly which ones) — `key` (PK), `value` (text, parsed per
  key same as env vars are today), `updated_at`, `updated_by`.
- **`audit_log`** — `id`, `account_id`, `action` (e.g.
  `'module.disable'`, `'config.set'`, `'bot_view.send'`,
  `'group_admin.kick'`), `target` (free-form, e.g. a chat id or module
  name), `detail` (jsonb, whatever's useful per action), `at`. Every
  state-changing API call writes one row here — see Phase 7 in
  `ROADMAP.md`, but the table itself lands in Phase 0 since retrofitting
  audit logging onto endpoints built without it is far more error-prone
  than building it in from the first mutating endpoint.

Nothing about warden's *existing* tables changes to support any of this
— `identities`, `chats`, `chat_members`, `chat_settings`, `bot_admins`,
`bot_allowed_users/chats`, `reminders`, `alerts`, `feed_watches`,
`user_settings`, etc. are read (and, where the bot's own commands already
allow writes, written) by the API exactly as they are by the bot's
command handlers — often literally the same store-module functions.

## 5. Module enable/disable

"Admins can enable/disable certain modules" needs a decision on what a
*module boundary* actually is, since warden's features aren't uniform:

- **Standalone command features** (Reminders, Alerts, Watches, Convert,
  Group Administration, Persona, Digest, Voice Transcription, `/menu`
  itself) toggle by an early-return check against `feature_flags` at the
  top of their branch in `main.zig`'s command dispatch (and the
  equivalent `/menu` `ActionRunner` branch) — small, mechanical, one
  check per module.
- **LLM-tool-shaped features** (Weather, Crypto Prices, Air Quality, QR
  Codes, Dictionaries, Urban Dictionary, Hacker News, Web Search, Site
  Scraping) are already registered through a single `tools/registry.zig`
  list handed to the LLM provider each turn — disabling one of these is
  just filtering that list against `feature_flags` before it's handed
  over, not touching each tool's own file at all. This is a genuinely
  convenient existing seam, not something warden-ui has to invent.

Module state is bot-wide, not per-chat (matches how the request was
phrased — "admins of the bot," not "admins of a group"). Per-chat feature
toggling isn't ruled out for later, but isn't in scope for the initial
build; if wanted later it's an additive `chat_feature_flags` table
layered the same way, not a redesign.

## 6. "Current .env settings, with the ability to change them"

`Config` today is loaded **once**, at process startup, directly from
environment variables (`config.zig`'s `Config.load`) — there is no live
config-mutation path anywhere in the bot today. Rather than pretend the
whole `.env` becomes a text box, each field was triaged:

| Category | Examples | Web UI treatment |
|---|---|---|
| Secrets | `WARDEN_TELEGRAM_BOT_TOKEN`, `WARDEN_MATRIX_ACCESS_TOKEN`, `WARDEN_XMPP_PASSWORD`, `WARDEN_POSTGRES_DSN`, `WARDEN_ANTHROPIC_API_KEY`, `WARDEN_OPENAI_API_KEY`, `WARDEN_MATRIX_PICKLE_KEY` | Shown **masked** (e.g. `sk-...ab12`) for confirmation that *something* is set, never editable from the browser. Changing these still means editing `.env` and restarting, exactly as today. |
| Identity/ownership | `WARDEN_TELEGRAM_OWNER_ID` and friends | Displayed, not a plain text field — changing "who owns the bot" is dangerous enough to deserve its own explicit, confirmed flow later, not a stray input box (out of scope for the initial build; see `ROADMAP.md`). |
| Safe behavioral tunables | pool size, acquire/statement timeouts, `WARDEN_WORKERS_PER_PLATFORM`, `WARDEN_RETENTION_MESSAGES`, confirm/convert/menu timeout seconds, `WARDEN_DIGEST_INTERVAL_SECONDS`, `WARDEN_LLM_OWNER_ONLY`, `WARDEN_LLM_SHOW_THINKING`, `WARDEN_LLM_STREAMING`, `WARDEN_LLM_MAX_TOKENS`, `WARDEN_LLM_HISTORY_MESSAGES`, `WARDEN_LLM_SKIP_TRIVIAL_MESSAGES` | Migrated to the new `dynamic_config` table (env var stays as the *fallback default* if no DB row exists, so upgrading doesn't change behavior until someone actually touches it in the UI) — editable live, takes effect on the next read (most of these are already read per-message/per-tick, not cached at startup, so "live" is accurate, not just aspirational). |
| Provider/model selection | `WARDEN_LLM_PROVIDER`, `WARDEN_ANTHROPIC_MODEL`, `WARDEN_OPENAI_MODEL`, `WARDEN_OPENAI_BASE_URL` | Dynamic (plain strings, no secret material) — swapping models live is safe and useful. Swapping *which provider* live is more involved (the provider object is constructed once at startup today). Decided 2026-07-28 (Armin): worth the extra scope — hot-swappable, not restart-only. Phase 3 needs a small refactor so the active provider is re-resolved per-call (or on a `dynamic_config` write) instead of being fixed at process start; see `ROADMAP.md` Phase 3. |
| Infra endpoints | `WARDEN_SEARXNG_URL`, `WARDEN_WHISPER_URL` | Editable, not masked (not secret), but currently read once at startup — changing them in the UI is honestly labeled "takes effect after restart" until/unless a later pass makes the relevant clients re-read per-call. |

This directly reflects the answer already given: *safe settings live,
secrets masked/read-only*. The table above is the concrete boundary, not
a restatement of the policy.

## 7. RBAC

Reuses warden's existing permission ladder (`auth.zig`) rather than
inventing a parallel one:

1. **Owner** — full access: everything below, plus module toggles,
   `dynamic_config` writes, Bot View sends, account/session admin.
2. **Bot admin** (`bot_admins` table) — same practical ceiling as owner
   for cross-chat moderation (mirrors `/sudo`'s existing meaning), module
   toggles and `dynamic_config` included, **except Bot View**: decided
   2026-07-28 (Armin) to keep Bot View **owner-only**, not
   bot-admin-inclusive, given how sensitive impersonating the bot's own
   voice is. Phase 6 should gate the send/subscribe endpoints on owner,
   not `bot_admins` membership.
3. **Group admin** — not a new DB role; resolved the same way the bot
   already resolves it, by asking the relevant connector
   (`connector.isGroupAdmin`) at the time of a group-scoped write. A
   logged-in account can see/edit settings **only for chats where at
   least one of its linked identities is currently a live platform
   admin** — checked per-request, not cached, so a demotion on Telegram
   takes effect on the web immediately too, same freshness guarantee
   `/persona`'s own owner-only check already has today (see README's
   existing "checked live against Telegram on every use, not cached").
4. **Regular authenticated user** — sees their own reminders/alerts, its
   own credit balance, chats they're a member of (read-only unless also a
   group admin there), and can link/unlink additional login methods to
   their account.
5. **Anonymous** — the login screen only.

No new role table is introduced for "group admin" — this was a deliberate
choice to avoid the DB-role and platform-truth ever disagreeing.

## 8. "Bot View" (respond on behalf of the bot)

The single most sensitive capability in the whole system: it lets an
admin post messages real users will see as coming from the bot itself,
indistinguishable from an automated reply.

- **Live incoming view**: a small in-memory pub/sub broadcaster, fed at
  the same point `main.zig`'s message-recording already runs (right next
  to `recordMessage`/`recordObservedUsers`), fans new messages out to any
  WebSocket clients subscribed to that chat. Nothing about message
  *processing* changes — this is a read-only tap, not a new place logic
  runs.
- **Send as bot**: calls the exact same `connector.sendMessage` any real
  reply already goes through — no parallel send path, no separate
  formatting/rate-limit logic to keep in sync.
- Every send is written to `audit_log` (§4) — who, which chat, the text,
  when. Given the trust level this capability requires, it's treated as
  the highest-friction action in the whole panel: confirmation-gated in
  the UI, and (per §7) possibly owner-only rather than open to every bot
  admin — left as an explicit decision point for whoever builds Phase 6,
  not settled here.

## 9. Frontend

- **Next.js (App Router) + TypeScript + Fluent UI React v9**
  (`@fluentui/react-components`) — the official Microsoft component
  library, chosen specifically because "Fluent design" was asked for
  literally, not just "something modern-looking." `FluentProvider` +
  `webLightTheme`/`webDarkTheme` covers the light/dark requirement
  natively, and Fluent's own token system (saturated brand colors, small
  corner radii by default) already matches the "saturated colors, not
  too rounded" instruction without a custom design system fight.
- Mostly **client-rendered** for the authenticated dashboard (heavy on
  live data/WebSocket updates, low value from server rendering) — Next.js
  is used for routing, build tooling, and a thin server-side auth gate
  (middleware redirecting unauthenticated requests to login), not for
  data-fetching server components throughout.
- **TanStack Query** for REST data-fetching/caching against warden's API;
  a small typed WebSocket hook for Bot View's live stream.
- i18n/RTL is *not* in the initial phases but is flagged here as a real
  forward-looking need — a meaningful share of warden's own user base is
  Persian-speaking (see `user_settings.zig`'s `language_code` heuristic
  table, which already special-cases `fa`/`fa-IR`) — Fluent UI React has
  built-in RTL support, so this is a "pick it up later without a
  rewrite" situation, not a blocker now.

## 10. Testing & observability

- Zig-side API code follows the existing repo's own convention: `test {}`
  blocks alongside the code, registered in `main.zig`'s test block (see
  warden's own `warden-zig-test-registration-gotcha` lesson — a new API
  source file's tests silently don't run if forgotten there), and logged
  through the existing `src/log.zig` tabular logger/`WARDEN_LOG_LEVEL`,
  not a separate logging path.
- Frontend: Vitest for unit tests, Playwright for the auth flows and
  critical mutating actions (module toggle, Bot View send) given how much
  damage a silent regression there could do.
- Also worth remembering for this specific codebase: `zig build test`
  only analyzes code reachable from `test {}` blocks — a real compile
  error in API code no test happens to reach can pass `zig build test`
  while `zig build` (the actual binary) fails. Always run both before
  calling API work done (this bit us once already this session).

## 11. Open questions / deliberately deferred decisions

Collected here so they're easy to find later, rather than buried in
whichever phase first bumps into them.

**Resolved 2026-07-28 (Armin):**

- Bot View is **owner-only**, not bot-admin-inclusive (§7, §8).
- LLM *provider* selection (not just model) **should be made
  hot-swappable**, not left restart-only — extra Phase 3 scope, worth it
  (§6).
- "Transfer bot ownership" **stays `.env`-and-restart indefinitely** — no
  guided UI flow planned (§6).
- warden-ui's GitHub repo is **public**, matching warden itself.
- `WARDEN_API_PORT=8081` confirmed with no conflict on the VPS.

**Still open:**

- Per-chat (not just bot-wide) module toggles — worth adding later? (§5)
- Real JWKS/RS256 ID-token verification as a hardening pass once the
  "trust the token-endpoint TLS channel" simplification (§3.1) needs
  tightening — e.g. before onboarding a security-sensitive customer.
