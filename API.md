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
| `GET /api/v1/auth/providers` | **Implemented (2026-07-28).** Public. `{telegram: {bot_username} \| null, google: null, oidc: []}` — Google/OIDC always empty until those methods are wired up. |
| `POST /api/v1/auth/telegram/callback` | **Implemented (2026-07-28).** Body: the Telegram Login Widget's returned fields. Verifies `hash` (HMAC-SHA256 against the bot token, per `src/api/telegram_login.zig`), resolves/creates the matching `identities` row + `accounts` row, issues a session cookie. |
| `GET /api/v1/auth/google/start` | Redirects to Google's `/authorize`. |
| `GET /api/v1/auth/google/callback` | Handles the redirect back, exchanges `code` server-side, calls `/userinfo`, resolves/creates identity+account, issues session cookie. |
| `GET /api/v1/auth/oidc/:providerId/start` / `.../callback` | Same shape as Google, generic over any enabled `oauth_providers` row. |
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
| `GET /api/v1/chats/:id/settings` | **Implemented (2026-07-28).** `{persona, magic_word, digest_enabled, thinking_override}` — `chat_settings` as-is. |
| `PATCH /api/v1/chats/:id/settings` | **Implemented (2026-07-28).** Body is the *whole* settings object, not a sparse partial update (JSON can't cleanly distinguish "field omitted" from "field explicitly null" without a wrapper type, and a settings-form PATCH naturally submits every field anyway) — same effect as `/persona`, `/magicword`, `/thinking`, `/digest`. |
| `GET /api/v1/chats/:id/members` | **Implemented (2026-07-28).** `chat_members` joined with `identities` for that chat, bots excluded, most-recently-active first. |

## Feature parity — Reminders / Alerts / Watches

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
| `GET /api/v1/bot-view/chats` | Chats available to view (same visibility rule as group settings). |
| `WS /api/v1/bot-view/ws?chat_id=` | Subscribes to a live feed of every message `main.zig` records for that chat, from the moment of connection onward (no history replay in the first cut — `GET` a chat's recent `messages` rows separately to backfill the pane on open). |
| `POST /api/v1/bot-view/chats/:id/send` | `{text}` — calls `connector.sendMessage` for that chat's platform, exactly as any other reply. Confirmation-gated client-side given what this does; every send is audit-logged server-side regardless. |

## What's deliberately not an endpoint (at least at first)

- Anything touching secrets (§6 of `ARCHITECTURE.md`) — no write path
  exists for them at all, by design, not just by omission.
- Changing bot ownership — no endpoint yet (see `ARCHITECTURE.md` §11).
- Per-chat module toggles — bot-wide only for now (see `ARCHITECTURE.md` §5).
