# warden-ui

A web control panel for [warden](../warden) — the Telegram/Matrix/XMPP bot.
This directory is planning-only right now: no application code has been
written yet. Start here, then read in this order:

1. **`ARCHITECTURE.md`** — the system design: how warden-ui talks to warden,
   the auth/RBAC model, the data model additions, the module-toggle
   mechanism, and every non-obvious decision made along the way (with the
   reasoning, so a future session doesn't have to re-derive it).
2. **`API.md`** — the concrete HTTP/WebSocket contract the two projects
   agree on. The source of truth for both warden's new API layer and
   warden-ui's data-fetching code once implementation starts.
3. **`ROADMAP.md`** — the phase-by-phase build plan. This project is large
   enough that it ships in slices, same spirit as warden's own
   `ROADMAP.md`: each phase is independently useful, ordered so earlier
   phases unblock later ones, with effort/dependency/status noted per
   phase.

## The one-sentence pitch

warden itself grows an HTTP+WebSocket API (same process, same Postgres
database, same permission checks the bot already enforces) — not a second
backend — and warden-ui is a separate Next.js + Fluent UI React app that
talks to that API. Two git repos, two deploys, one source of truth.

## Why a separate repo, not a subdirectory of warden

warden is a Zig project; warden-ui is a Node/TypeScript project. Different
toolchains, different dependency ecosystems, different release cadence
(the frontend will iterate far faster than the bot's core logic) — bundling
them would make both `zig build` and the frontend's own tooling clumsier
for no real benefit, since they only ever talk to each other over HTTP.

## Status

Planning only, 2026-07-27. See `ROADMAP.md` for where to pick up.
