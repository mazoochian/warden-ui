# warden-ui ↔ warden API contract (sketch)

This is a planning-stage sketch of the surface, not a frozen spec — it
exists so `ROADMAP.md`'s phases have a concrete shape to build against and
so warden-ui's data layer and warden's API layer are designed against the
same picture from day one. Expect this to gain a real OpenAPI/JSON-Schema
doc once Phase 0 implementation starts; this file stays as the
human-readable map.

All endpoints live under `/api/v1/`, served by warden itself (see
`ARCHITECTURE.md` §1). Everything except `/api/v1/auth/*` and the login
pages requires a valid session cookie; requests without one get `401`.

## Conventions

- JSON in, JSON out, `application/json` (multipart only for file upload —
  Convert).
- Errors: `{"error": {"code": "not_found", "message": "..."}}` with a
  matching HTTP status — `400`/`401`/`403`/`404`/`409`/`429`/`500`.
- Pagination on list endpoints: `?cursor=&limit=` (default 50, max 200),
  response shape `{"items": [...], "next_cursor": "..." | null}`.
- Every mutating endpoint (`POST`/`PATCH`/`DELETE`) writes one
  `audit_log` row server-side — not something the caller opts into.
- IDs in URLs are warden's own internal bigint ids (`chats.id`,
  `identities.id`, etc.) — never a platform-native id, to keep the API
  platform-agnostic the same way the store layer already is.

## Auth

| Method & path | Purpose |
|---|---|
| `GET /api/v1/auth/providers` | **Implemented (2026-07-28).** Public. `{google: null, oidc: [{id, name}]}` — `oidc` lists every enabled `oauth_providers` row (Telegram's own OIDC provider is the one production entry today). Google stays empty until that method is wired up. |
| `GET /api/v1/auth/oidc/:providerId/start` / `.../callback` | **Implemented (2026-07-28), Telegram's provider only.** Authorization Code + PKCE against the named `oauth_providers` row (`src/api/oidc.zig`) — discovers the provider's endpoints, redirects to its own login page, exchanges the returned code, verifies the ES256-signed `id_token` against the provider's JWKS, resolves/creates the matching `identities` row + `accounts` row, issues a session cookie. Replaced the old HMAC-signed Telegram Login Widget outright (`POST /api/v1/auth/telegram/callback`, removed 2026-07-28) — Telegram itself now describes that mechanism as legacy/archived in favor of real OIDC. ES256 only: Zig's standard library has no RSA, so a provider using this must have its signing algorithm switched away from the RS256 default (Telegram: BotFather's Web Login settings). |
| `GET /api/v1/auth/google/start` | Redirects to Google's `/authorize`. |
| `GET /api/v1/auth/google/callback` | Handles the redirect back, exchanges `code` server-side, calls `/userinfo`, resolves/creates identity+account, issues session cookie. |
| `POST /api/v1/auth/link/:method/start` | Requires an existing session. Same redirect dance as above, but on success adds an `account_identities` row to the *current* account instead of creating a new one. |
| `POST /api/v1/auth/logout` | Revokes the current `web_sessions` row, clears the cookie. |
| `GET /api/v1/auth/session` | **Implemented (2026-07-28).** `{authenticated: false}`, or `{authenticated: true, account_id, display_name, avatar_url, identity_ids: [...], roles: {owner, bot_admin}}`. `roles` landed with Phase 2 (the first page that needed it) — `admin_of_chats` (per-chat live-admin status) still isn't included, deferred to Phase 4 which is the first thing that needs it. `identity_ids` is bare ids, not full identity objects, until something needs more. The frontend's one call on every page load to know what to render. |

## Account

| Method & path | Purpose |
|---|---|
| `GET /api/v1/me/identities` | Every identity linked to the caller's account. |
| `DELETE /api/v1/me/identities/:identityId` | Unlink — refuses (`409`) if it's the account's last remaining identity. |
| `GET /api/v1/me/sessions` | **Implemented (2026-07-28).** `{items: [{id, created_at, expires_at, user_agent, ip, current}]}` — every live `web_sessions` row for the account, most recent first. `ip` is always `null` for now (deferred until there's a reverse proxy and real `X-Forwarded-For` handling, Phase 7 — see `ARCHITECTURE.md`). `current: true` marks whichever session the request itself is authenticated with. |
| `DELETE /api/v1/me/sessions/:sessionId` | **Implemented (2026-07-28).** Revoke a specific session (including, deliberately, the ability to revoke the one making the request — that's just "log out"). `404` (not `403`) if `sessionId` isn't a live session owned by the caller, to avoid confirming it exists at all to someone who doesn't own it. |
| `GET /api/v1/me/settings` | **Implemented (2026-07-28).** `{utc_offset_minutes, date_format, time_format}` — same data `/menu`'s Settings → Personal already exposes, now over HTTP. Resolves against the account's *first* linked identity (documented simplification: no account-linking flow exists yet, so this is unambiguous today). |
| `PATCH /api/v1/me/settings` | **Implemented (2026-07-28).** Whole-object body, same "no sparse partial update" contract as the chat settings endpoint above. `null` on any field clears that override. |
| `GET /api/v1/me/credits` | Current LLM credit balance (`identities.credits`). |

## Admin — modules & config (owner/bot admin only)

| Method & path | Purpose |
|---|---|
| `GET /api/v1/admin/modules` | **Implemented (2026-07-28).** `{items: [{key, label, category, enabled}]}` — every module in `store/feature_flags.zig`'s `known_modules` (the single source of truth `main.zig`'s dispatch gates and the LLM tool filter both check against too), unioned with whatever's been explicitly toggled. `category` is `"standalone"` or `"llm_tool"`, for the frontend's grouping requirement. |
| `PATCH /api/v1/admin/modules/:module` | **Implemented (2026-07-28).** `{"enabled": false}` — flips one module, `404` for an unknown key. See `ARCHITECTURE.md` §5 for exactly what disabling a module means at the dispatch level — notably, a toggle blocks *creating/changing* things (the `/remind` command, the `set_reminder` LLM tool, the reminders wizard in `/menu`, etc.) but deliberately leaves read-only actions (`/reminders`, `/alerts`, `/watches` listings) available regardless, and `group_admin` covers everything in `ROADMAP.md` Phase 5b's moderation bucket (mute/unmute/pin/unpin/delete/promote/demote/kick/ban/confirm/cancel/redact), gated at both the slash-command dispatch and the `/menu` equivalents since they're independent entry points to the same actions. |
| `GET /api/v1/admin/config` | **Implemented (2026-07-28).** `{items: [{key, label, category, value, is_override}]}`. `category` is `"secret"` (masked to `"••••" + last 4 chars`, `is_override: null`, read live from the process's own `Config` — never touches `dynamic_config`) or `"dynamic"` (one of `dynamic_config.known_keys`, `is_override` true/false). Identity/infra/restart-required fields from `ARCHITECTURE.md` §6 aren't listed yet — deferred, since this endpoint's job is surfacing what's actually live/maskable and neither of those is either. |
| `PATCH /api/v1/admin/config/:key` | **Implemented (2026-07-28).** `{"value": "..."}` — `403` for any key not in `dynamic_config.known_keys` (covers secrets *and* identity/infra/restart-required, all rejected the same way: there's no path that accepts a secret at all, and accepting a write for an infra/restart-required key would silently go nowhere since nothing reads it back live). `400` if the value doesn't parse as that key's expected type (bool/i64/string). `WARDEN_LLM_PROVIDER` (the one `string`-kind key) additionally requires the named provider (`"anthropic"`/`"openai_compat"`) to actually have credentials configured — see `ARCHITECTURE.md` §6's "Provider selection" row. |
| `GET /api/v1/admin/audit-log` | Paginated audit trail, filterable by `?action=`/`?account_id=`/`?since=`. |

## Admin — Storage Sense (owner only, never bot_admin)

First documented here 2026-09-01 (Phase 14). Gated by a strict
`requireOwner` (not `requireAdmin`) — same tier `handleStorageCommand`
reserves for `/storage` on the bot-chat side, since this can prune/
resample real chat history and flip the ladder's autopilot switch.

| Method & path | Purpose |
|---|---|
| `GET /api/v1/admin/storage/status` | `{used_pct, total_bytes, available_bytes, watermark, low_watermark_pct, high_watermark_pct, flood_watermark_pct, autopilot_enabled, sleep_active}` — a structured counterpart to `/storage status`'s text report, since a web dashboard wants real fields to build tiles from. `watermark` is one of `"normal"`/`"low"`/`"high"`/`"flood"`. |
| `PATCH /api/v1/admin/storage/autopilot` | `{enabled}` — mirrors `/storage autopilot on\|off`. |
| `POST /api/v1/admin/storage/cleanup/tmp` | Mirrors `/storage cleanup tmp`. `{files_deleted, bytes_freed}`. |
| `POST /api/v1/admin/storage/cleanup/messages` | `{chat_id?, keep_last?, before?}` — mirrors `/storage cleanup messages`. `chat_id` omitted means every chat (the ladder's own global sweep), deliberately not "the current chat" the command defaults to, since there's no such concept over the web. `keep_last` needs a concrete `chat_id`; `before` (`YYYY-MM-DD`) or neither (falls back to the configured prune-age default) both work bot-wide or per-chat. |
| `POST /api/v1/admin/storage/cleanup/resample` | `{chat_id?}` — mirrors `/storage cleanup resample`. `chat_id` omitted means every chat. |

## Admin — stats & directory

| Method & path | Purpose |
|---|---|
| `GET /api/v1/admin/stats/overview` | **Implemented (2026-07-28).** `{total_messages, total_chats, total_identities, messages_last_24h, messages_last_7d, active_chats_last_7d}` — new `store/admin_directory.zig` (bot-wide queries; `store/stats.zig` stayed chat-scoped, untouched). Requires owner/bot_admin (`401`/`403`). |
| `GET /api/v1/admin/chats` | **Implemented (2026-07-28).** Paginated (`?cursor=&limit=`) chat directory: `{items: [{id, platform, native_chat_id, title, member_count, message_count, digest_enabled}], next_cursor}`. |
| `GET /api/v1/admin/chats/:id` | **Implemented (2026-07-28).** One chat's detail: settings (`chat_type`, `digest_enabled`, `magic_word`), member/message counts, last 10 messages (`recent_messages`, newest first). |
| `GET /api/v1/admin/identities` | **Implemented (2026-07-28).** Paginated user directory (bots excluded): `{items: [{id, platform, display_name, username, is_bot_admin, is_allowed, credits, last_seen}], next_cursor}`. |
| `GET /api/v1/admin/identities/:id` | **Implemented (2026-07-28).** Adds `native_id` to the summary shape above. |
| `POST /api/v1/admin/bot-admins` / `DELETE .../:identityId` | Grant/revoke bot admin — same authorization + effect as `/addadmin`/`/removeadmin`. |
| `POST /api/v1/admin/allowlist/users` / `DELETE .../:identityId` | Same as `/adduser`/`/removeuser`. |
| `POST /api/v1/admin/allowlist/chats` / `DELETE .../:chatId` | Same as `/allowchat`/`/disallowchat`. |

## Groups (chat-scoped — group admin of that chat, bot admin, or owner)

| Method & path | Purpose |
|---|---|
| `GET /api/v1/chats?mine=true` | **Implemented (2026-07-28).** Chats the caller can manage: `{items: [{id, platform, native_chat_id, title, is_group_admin}]}` — every chat for owner/bot_admin, or only chats the caller is both a member of and currently a *live* platform admin of otherwise. `?mine=true` is the only supported mode (the query param is accepted but not actually inspected — there's no other listing shape yet). |
| `GET /api/v1/chats/:id/settings` | **Implemented (2026-07-28), widened (2026-09-01).** `{persona, magic_word, digest_enabled, thinking_override, briefing_enabled, default_location, welcome_message, autopin_announcements, video_download_enabled, video_download_lossy, slowmode_seconds}` — `chat_settings` as-is, plus `slowmode_seconds` from the `rate_limits` table (grouped into this same whole-object endpoint despite the different backing table — just another per-chat setting from the caller's perspective). The 2026-09-01 fields close the gap warden's own Phases 13/16/24/25 opened (those features shipped bot-side with no web story at all). |
| `PATCH /api/v1/chats/:id/settings` | **Implemented (2026-07-28), widened (2026-09-01).** Body is the *whole* settings object, not a sparse partial update (JSON can't cleanly distinguish "field omitted" from "field explicitly null" without a wrapper type, and a settings-form PATCH naturally submits every field anyway) — same effect as `/persona`, `/magicword`, `/thinking`, `/digest`, `/briefing`, `/location`, `/welcome`, `/autopin`, `/videodownload`, `/videoquality`, `/slowmode`. `welcome_message`/`default_location` are **owner-only to change** (mirroring `/welcome`/`/location`'s own gate) — stricter than this endpoint's own baseline (live group admin), so the handler separately requires `roles.owner` when either value actually differs from what's stored; every other field stays at the endpoint's normal tier. |
| `GET /api/v1/chats/:id/members` | **Implemented (2026-07-28).** `chat_members` joined with `identities` for that chat, bots excluded, most-recently-active first. |
| `GET /api/v1/chats/:id/members/:identityId/permissions` | **Implemented (2026-09-01).** `{bits}` — no bot-chat equivalent exists (`/permission` only ever changes bits, never displays one member's current mask), but a checkbox-per-bit editor needs a starting state from somewhere. |
| `PATCH /api/v1/chats/:id/members/:identityId/permissions` | **Implemented (2026-09-01).** `{bits, expires_at}` — mirrors `/permission`, except the whole resulting bitmask is set explicitly rather than a `+`/`-<letters>` change (the web editor already knows the mask it wants). `expires_at: null` is permanent; set, it auto-reverts once it lapses, same as the command's `<duration>` argument. Best-effort live enforcement — `error.Unsupported` (no granular permission concept on this platform) is silent; the bitmask is saved regardless. |
| `PATCH /api/v1/chats/:id/members/:identityId/tag` | **Implemented (2026-09-01).** `{title}` — mirrors `/tag <@user> <text>`/`/tag <@user> off` (`title: ""` is `off`). Telegram only, target must already be a chat administrator there — surfaced as a real error (unlike permissions above, there's no stored value independent of the live call succeeding). |
| `GET /api/v1/chats/:id/keyword-alerts` | **Implemented (2026-09-01).** Open to any chat member (unlike `GET .../members` above, which needs live-admin access) — same view tier as `/keyword list`. `{items: [{id, chat_id, identity_id, keyword, created_at}]}`. |
| `POST /api/v1/chats/:id/keyword-alerts` | **Implemented (2026-09-01).** `{keyword, identity_id?}` — mirrors `/keyword add <word>`, open to any chat member (same `resolveCreateIdentity` authorization as reminders/alerts/notes/expenses) — deliberately *not* admin-gated, since adding a keyword only affects what fires for the adder. Gated on the `keyword_alerts` feature flag. |
| `DELETE /api/v1/keyword-alerts/:id` | **Implemented (2026-09-01).** Same authorization as `/keyword remove`: whoever added it, or the bot owner. |

## Feature parity — Reminders / Alerts / Watches / Notes

Scoped to the caller's own identity by default (`?chat_id=` narrows to
one chat; a bot admin/owner can pass `?identity_id=` to view/manage on
behalf of someone else, mirroring how e.g. `/redact` already lets a bot
admin act beyond their own messages).

| Method & path | Purpose |
|---|---|
| `GET /api/v1/reminders?chat_id=` | Pending reminders — same shape as `/reminders`, each already rendered in *that reminder's setter's* timezone/format (see this session's work). |
| `POST /api/v1/reminders` | `{chat_id, when: {kind: "duration"\|"absolute", ...}, message, recur_interval_seconds?}` — the "when" shape intentionally mirrors the wizard's own step data (date/hour/minute/second, or a duration), so the frontend's create-reminder form *is* effectively the wizard, just rendered as a real date/time picker instead of stepper buttons. |
| `DELETE /api/v1/reminders/:id` | Same authorization as `/remind cancel` — setter or owner. |
| `GET/POST/DELETE /api/v1/alerts...` | Same shape, mirroring `/alert`. |
| `GET/POST/DELETE /api/v1/watches...` | Same shape, mirroring `/watch`. |
| `GET /api/v1/notes?chat_id=` | **Implemented (2026-08-02).** `{items: [{id, chat_id, chat_title, text, created_at}]}` — mirrors `/note list`/`/notes`, but identity-scoped like Reminders/Alerts/Watches above rather than chat-scoped like the bot's own in-chat `/notes` (which shows every contributor's notes together in that one chat). New `notes.NoteForIdentity`/`notes.listForIdentity` in warden's store layer, added alongside this endpoint since warden's Phase 11 (`ROADMAP.md`) only shipped the chat-scoped `listForChat` the bot commands needed. |
| `POST /api/v1/notes` | `{chat_id, text, identity_id?}` — mirrors `/note add <text>`. `text` capped at 1000 bytes, same as the command. Gated by the `notes` feature flag (already used bot-side by `/note`/`set_note`; also newly added to `feature_flags.known_modules` so it actually shows up as a toggle on `/admin/modules` — it existed as a gate before this but wasn't listed there). |
| `DELETE /api/v1/notes/:id` | Same authorization as `/note delete`: whoever added it, or the bot owner — **not** "anyone in the chat" like Watches' removal is. |

## Feature parity — Finance

**Implemented on warden's side well before warden-ui's Phase 9** (its own
`ROADMAP.md` Phase 17) — consumed here for the first time, not new API
surface. Every amount is an integer cent count on the wire, never a float;
`src/lib/money.ts`'s `parseAmountCents`/`formatCents` do the client-side
conversion.

| Method & path | Purpose |
|---|---|
| `GET /api/v1/expenses?chat_id=&identity_id=&category=&since=&limit=` | Identity-scoped like Notes ("my spending across every chat" by default) — unlike the bot's own `/expense list`, which is chat-scoped. |
| `GET /api/v1/expenses/summary?chat_id=&since=` | Chat-scoped totals by category, cross-referenced against that chat's budgets. `since` is required from the caller (no server-side "this calendar month" guess, since the month boundary depends on the viewer's own UTC offset). |
| `POST /api/v1/expenses` | Mirrors `/expense add <amount> <category> [description]` — open to anyone in the chat. |
| `DELETE /api/v1/expenses/:id` | Same authorization as `/expense delete`: whoever recorded it, or the bot owner. |
| `GET /api/v1/budgets?chat_id=` | Chat-scoped, readable by any member — a budget is chat-wide policy, not a personal record. |
| `PUT /api/v1/budgets` | Upsert keyed by `(chat_id, category)` — **owner only**, same tier as a persona override. |
| `DELETE /api/v1/budgets/:id` | Owner only, same as the `PUT` above. |
| `GET /api/v1/subscriptions?chat_id=&identity_id=` | Identity-scoped like expenses; each row carries a server-computed `monthly_equivalent_cents` so the panel never re-derives the 30-day-month normalization itself. |
| `POST /api/v1/subscriptions` | Mirrors `/subscription add <name> <amount> every <interval>` — takes `interval_days` as a plain integer rather than the bot's `1mo`/`2w` shorthand, since a picker is a better web fit than re-parsing that shorthand client-side. |
| `DELETE /api/v1/subscriptions/:id` | Same authorization as `/subscription remove`: whoever added it, or the bot owner. |

## Feature parity — Announcements

Chat-scoped, not identity-scoped-across-chats like Reminders/Alerts/
Watches/Notes/Expenses/Subscriptions above — a scheduled announcement is
a chat-level admin object, same reasoning `reminders.listForIdentity`'s
own hard `kind = 'reminder'` filter documents.

| Method & path | Purpose |
|---|---|
| `GET /api/v1/chats/:id/announcements` | **Implemented (2026-09-01).** `{items: [{id, identity_id, message, due_at, recur_interval_seconds}]}` — mirrors `/announce list`, gated at this endpoint's own live-group-admin tier (stricter than the command's own "open to any chat member" list, same accepted simplification `digest_enabled` already has). |
| `POST /api/v1/chats/:id/announcements` | **Implemented (2026-09-01).** `{message, when, recur_interval_seconds?}` — `when` is the exact same shape `POST /api/v1/reminders` uses. Mirrors `/announce at`/`/announce every` only — a bare `/announce <text>` (send now, pinned) has no web equivalent; that's a connector-backed send closer to Bot View than a settings-page create form. |
| `DELETE /api/v1/announcements/:id` | **Implemented (2026-09-01).** Mirrors `/announce cancel` — gated at the *target chat's* live-group-admin tier (looked up from the row itself). |

## Feature parity — Memory

Unlike every other identity-scoped resource on this page, **neither
endpoint takes a `?identity_id=` admin override**. warden's own
`/memory forget` refuses even the bot owner permission to forget someone
else's memory (`mem.identity_id != self.identity_id`, no `isOwner`
fallback) — a memory is a private fact about one person, not a shared
chat record, so the web API holds the same line.

| Method & path | Purpose |
|---|---|
| `GET /api/v1/memory` | **Implemented (2026-09-01).** `{items: [{id, identity_id, text, created_at}]}` — mirrors `/memory list`, strictly the caller's own identity. |
| `DELETE /api/v1/memory/:id` | **Implemented (2026-09-01).** Mirrors `/memory forget` — only an identity linked to the caller's own account. Creation isn't exposed here at all: it's model-driven (`remember_memory`'s `action=create`), not a form. |

## Feature parity — Convert

| Method & path | Purpose |
|---|---|
| `POST /api/v1/convert` | Multipart: the file + target format. Synchronous response once conversion completes (matches today's one-shot `/convert <format>` caption command) — the interactive multi-step flow (`/convert` alone) doesn't need a UI equivalent, since a file-picker + format-dropdown form *is* the non-interactive shape already. |

## Feature parity — Group Administration

| Method & path | Purpose |
|---|---|
| `POST /api/v1/chats/:id/actions/{kick,ban,mute,unmute,pin,unpin,promote,demote}` | Body identifies the target identity. Same `checkGroupAdminAccess` ladder as the slash commands — a live platform admin of that specific chat, a bot admin, or the owner; **no extra confirmation step**, matching the existing "kick/ban via a button fire immediately" convention from `/menu`. |
| `POST /api/v1/chats/:id/actions/redact` | `{mode: "lastn"\|"user"\|"text"\|"regex", ...}` — regex mode keeps its stricter bot-admin/owner-only gate (`isOwnerOrSudoBotAdmin`), unchanged from today. |

## Bot View (highest-sensitivity surface — see `ARCHITECTURE.md` §8)

| Method & path | Purpose |
|---|---|
**Implemented (2026-07-28), owner-only** — not extended to bot admins even though most other admin actions are (`ARCHITECTURE.md` §7).

| Method & path | Purpose |
|---|---|
| `GET /api/v1/chats?mine=true` | Chat picker — reused as-is rather than a separate `/bot-view/chats` endpoint (owner already sees every chat there, which is exactly Bot View's own visibility rule). |
| `GET /api/v1/bot-view/ws?chat_id=` | WebSocket upgrade. Subscribes to a live feed of every message `main.zig` records for that chat (via the same read-only tap next to `recordMessage`), from the moment of connection onward — no history replay (`GET` a chat's recent `messages` rows separately to backfill the pane on open). |
| `POST /api/v1/bot-view/send` | `{chat_id, text}` — calls `connector.sendMessage` for that chat's platform, exactly as any other reply; no parallel send path. Confirmation-gated client-side given what this does; every send is audit-logged server-side (`bot_view.send`) regardless. |

## Personal Account (owner-only — the owner's real Telegram account via TDLib)

Every endpoint here is gated by `requireTelegramUserConnector`: `roles.owner`
specifically (never `bot_admin`), and `404` (not `403`) if
`WARDEN_TELEGRAM_USER_*` isn't configured on this deployment at all — from
the caller's perspective the feature simply doesn't exist there. First
documented here 2026-09-01 (Phase 10) — the login/chats/summarize/send
endpoints existed earlier but had no `API.md` coverage or frontend at all
until this phase.

| Method & path | Purpose |
|---|---|
| `GET /api/v1/telegram-user/status` | `{auth_state}` — one of TDLib's own auth states (`none`, `wait_tdlib_parameters`, `wait_phone_number`, `wait_code`, `wait_password`, `ready`, `logging_out`, `closed`, `unsupported`). |
| `POST /api/v1/telegram-user/phone` | `{phone_number}` — only accepted while `auth_state == wait_phone_number`. |
| `POST /api/v1/telegram-user/code` | `{code}` — only accepted while `auth_state == wait_code`. No obfuscation-stripping (unlike the bot-chat command path): this is warden-ui's own HTTPS form, never a Telegram message, so there's nothing for Telegram's phishing detector to have invalidated. |
| `POST /api/v1/telegram-user/password` | `{password}` — only accepted while `auth_state == wait_password` (2FA accounts only). |
| `POST /api/v1/telegram-user/logout` | **Implemented (2026-09-01).** Mirrors `/tdlogout`. `409 not_ready` if `auth_state == none` (nothing to log out of yet). |
| `GET /api/v1/telegram-user/chats[?query=]` | Every known chat (or a title-filtered subset), sorted by title: `{chats: [{native_chat_id, title}]}` — no pagination, a web table just scrolls. |
| `POST /api/v1/telegram-user/chats/summarize` | `{chat_id, all?}` — mirrors `/tdsummary`. `all: true` is `--all` (last-100 regardless of read state, no mark-as-read); default is the unread-and-mark-read behavior. |
| `POST /api/v1/telegram-user/chats/send` | `{chat_id, message}` — mirrors `/tdsend`/`/sendas`. |
| `GET /api/v1/telegram-user/autonomy` | **Implemented (2026-09-01).** `{global}` — the owner's global `reply_autonomy` default (`off`\|`draft`\|`auto`), mirrors `/autonomy`'s no-arg form. Resolved from the caller's own logged-in identity, not `WARDEN_TELEGRAM_OWNER_ID` — `requireTelegramUserConnector` already establishes the caller *is* the owner. |
| `PATCH /api/v1/telegram-user/autonomy` | **Implemented (2026-09-01).** `{global}` — mirrors `/autonomy <off\|draft\|auto>`. |
| `GET /api/v1/telegram-user/chats/:nativeChatId/autonomy` | **Implemented (2026-09-01, extended 2026-09-03).** `{override, effective, prompt}` — `override` is this chat's own setting (`null` if unset), `effective` is what actually applies (the override, or the global default), `prompt` is this chat's ghostwriter-voice override (`null` = the built-in write-as-the-owner prompt). Deliberately *not* the `/persona` system prompt: that one styles Warden answering as itself, this one styles it impersonating the owner. `404` if Warden has no `chats` row for that native id yet (a message must be exchanged with it first, same as `/autonomy <chat id>`). |
| `PATCH /api/v1/telegram-user/chats/:nativeChatId/autonomy` | **Implemented (2026-09-01, extended 2026-09-03).** `{override, prompt?}` — `override: null` clears the override (mirrors `/autonomy <chat id> clear`). `prompt` carries three meanings and the encoding matters: **omit it** to leave the ghostwriter voice untouched (so a UI flipping only the level never clobbers it), pass **`""`** (empty or all-whitespace) to clear it back to the built-in prompt, or pass any other string to set it (mirrors `/autonomy <chat id> prompt [<text>\|off]`). Note an explicit JSON `null` means *leave alone*, **not** clear -- std.json cannot distinguish it from an absent field, so `""` is the clear sentinel. Body limit is 4 KiB. |
| `GET /api/v1/feed` | **Implemented (2026-09-04).** `{enabled, runnable, target_native_chat_id, policy, interval_seconds, last_run_at, sources[]}` — the curated feed's settings plus its source list, mirroring `/feed`'s status output. `runnable` is the backend's own `Settings.isRunnable` (enabled **and** a target **and** a policy), so the UI can distinguish "on" from "on but not configured" without re-deriving that rule. |
| `PATCH /api/v1/feed` | **Implemented (2026-09-04).** `{enabled?, target_native_chat_id?, policy?, interval_seconds?}` — every field optional so one dial can change without resending the rest. `""` clears `target_native_chat_id`/`policy` (an explicit JSON `null` reads as *leave alone*, same std.json limitation as the per-chat autonomy prompt). `interval_seconds` below 300 is rejected. |
| `POST /api/v1/feed/sources` | **Implemented (2026-09-04).** `{query}` — a TDLib chat id or a chat name, resolved server-side the same way `/feed add` resolves it; `404` when nothing matches, `400 ambiguous` when more than one does. |
| `DELETE /api/v1/feed/sources/:nativeChatId` | **Implemented (2026-09-04).** Mirrors `/feed remove`. `404` if that channel isn't watched. |
| `POST /api/v1/feed/run` | **Implemented (2026-09-04).** Runs one pass now, mirroring `/feed run`; `{posted}` is how many items the digest carried. Synchronous — a pass is bounded by the per-pass ceilings in `features/curated_feed.zig`. `400 not_configured` when the feed has no target or policy. |
| `GET /api/v1/telegram-user/drafts` | **Implemented (2026-09-01, extended 2026-09-03).** `{items: [{native_chat_id, chat_title, incoming_text, draft_text, replaced_draft}]}`, newest first — mirrors `/drafts`. `incoming_text` is the message being replied to; `replaced_draft` is non-null only when writing the draft into that chat's Telegram composer overwrote something the owner had already typed there. Now reads the `reply_drafts` **table** rather than a process-lifetime in-memory map, so drafts survive a restart or redeploy (before this, a deploy silently emptied this endpoint). |
| `POST /api/v1/telegram-user/chats/:nativeChatId/draft/approve` | **Implemented (2026-09-01).** Mirrors `/approve <chat id>` — sends the draft exactly as generated, through the personal-account connector, no parallel send path, then clears that chat's Telegram composer (the draft was written into it when created, and leaving it there invites sending the same message twice). `404` if there's no pending draft for that chat (or it expired). |
| `DELETE /api/v1/telegram-user/chats/:nativeChatId/draft` | **Implemented (2026-09-01).** Mirrors `/discard <chat id>`, and clears that chat's Telegram composer too. |

## What's deliberately not an endpoint (at least at first)

- Anything touching secrets (§6 of `ARCHITECTURE.md`) — no write path
  exists for them at all, by design, not just by omission.
- Changing bot ownership — no endpoint yet (see `ARCHITECTURE.md` §11).
- Per-chat module toggles — bot-wide only for now (see `ARCHITECTURE.md` §5).
