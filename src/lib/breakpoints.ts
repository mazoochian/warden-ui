"use client";

import { useSyncExternalStore } from "react";

/**
 * The app's two responsive breakpoints (`ROADMAP.md` Phase 10).
 *
 * Deliberately **two**, not a five-step scale: this panel has exactly two
 * layout problems to solve, so inventing `xs/sm/md/lg/xl` would be five
 * names for two behaviors.
 *
 * - `compact` (below 1024px) is where the 252px persistent sidebar stops
 *   paying for itself. It's picked off the real content budget rather
 *   than a round number: a tablet in portrait is 820px wide, and 820 minus
 *   the sidebar leaves 568px for data-dense tables, which is worse than
 *   putting the same nav behind a drawer button. Above it the sidebar
 *   stays exactly as it was.
 * - `narrow` (below 600px) is phone territory, where the remaining desktop
 *   assumptions (28px page gutters, two-up form grids, a name next to the
 *   avatar) each cost more than they're worth.
 *
 * The `.98px` maximums (rather than `1023px`/`599px`) close the gap a
 * fractional viewport width -- a 1023.5px window on a fractional-DPI
 * display -- would otherwise fall into, matching neither the `max-width`
 * nor a `min-width: 1024px` counterpart.
 */
export const breakpoints = {
  compact: 1024,
  narrow: 600,
} as const;

/**
 * Griffel-ready media query strings. Prefer these over `useIsCompact()`
 * wherever the change is purely visual: a media query needs no JS, no
 * state, and renders correctly on the very first paint, whereas the hook
 * necessarily reports "not compact" until after hydration. The hook
 * exists only for the one case CSS genuinely can't express -- see below.
 */
export const media = {
  compact: `@media (max-width: ${breakpoints.compact - 0.02}px)`,
  narrow: `@media (max-width: ${breakpoints.narrow - 0.02}px)`,
  regular: `@media (min-width: ${breakpoints.compact}px)`,
} as const;

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(`(max-width: ${breakpoints.compact - 0.02}px)`);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function getSnapshot() {
  return window.matchMedia(`(max-width: ${breakpoints.compact - 0.02}px)`).matches;
}

function getServerSnapshot() {
  return false;
}

/**
 * `true` when the viewport is below the `compact` breakpoint.
 *
 * Only for behavior CSS can't do -- in practice, exactly one thing:
 * `AppShell`'s single nav button has to *mean* two different things
 * ("collapse the sidebar" vs "open the drawer"), which is a difference in
 * what a click does and what the button is announced as, not in how it
 * looks. Everything else in this pass is a `media` query.
 *
 * `useSyncExternalStore` (not `useState` + `useEffect`) so React uses
 * `getServerSnapshot`'s `false` for the server render and hydration, then
 * re-renders with the real value -- no hydration mismatch warning, and no
 * flash of a wrong-but-committed layout in between.
 */
export function useIsCompact(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
