import { en } from "./en";

/**
 * Groundwork for i18n/RTL per `ARCHITECTURE.md` §9 -- a meaningful share
 * of warden's own user base is Persian-speaking, and Fluent UI React has
 * built-in RTL support, so the plan has always been "pick this up later
 * without a rewrite," not "never." This is deliberately the smallest
 * useful step: a flat key -> English string map plus a `t()` lookup, not
 * a full framework (no `next-intl`/`react-i18next` dependency -- nothing
 * in `package.json` already pulls one in, and the app doesn't need
 * per-route bundles or ICU plural rules at this scale).
 *
 * **No locale switching is wired up yet** -- `t()` always reads from
 * `en`. Adding a real second locale means: write `fa.ts` as
 * `Record<I18nKey, string>` (missing keys are a compile error via
 * `satisfies`), then thread a locale value into this module (a context
 * provider reading `user_settings`/browser `Accept-Language`, the same
 * kind of heuristic warden's own `language_code` handling already uses
 * server-side) and switch which table `t()` reads from. Out of scope
 * here -- see `ROADMAP.md` Phase 7's own note on exactly what did and
 * didn't get converted to use this.
 *
 * RTL itself is a separate, still-open follow-up: swapping in a Persian
 * `dir="rtl"` document needs Fluent's own RTL support enabled
 * (`FluentProvider`'s `dir` prop) *and* an audit of any hardcoded
 * `left`/`right`/`marginLeft`/etc. CSS in this codebase that should be
 * logical properties (`insetInlineStart`/`marginInlineStart`/...)
 * instead -- not attempted here, see the ROADMAP entry for what's known
 * to need it.
 */
export type I18nKey = keyof typeof en;

/**
 * Looks up `key` in the active strings table (today, always `en`) and
 * substitutes any `{{name}}` placeholders from `values`. Missing
 * placeholders are left as literal text rather than throwing -- a
 * placeholder typo should be visible in the UI during review, not crash
 * the page.
 */
export function t(key: I18nKey, values?: Record<string, string | number>): string {
  const template: string = en[key];
  if (!values) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : match,
  );
}
