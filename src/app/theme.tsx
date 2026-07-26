"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type ThemePreference = "light" | "dark";

const STORAGE_KEY = "warden-ui-theme";

const ThemeContext = createContext<{
  theme: ThemePreference;
  setTheme: (t: ThemePreference) => void;
} | null>(null);

/**
 * Reads the theme choice the inline script in `layout.tsx`'s `<head>`
 * already stamped onto `<html data-theme>` before hydration (see that
 * script for why: it exists purely to avoid a flash of the wrong theme
 * on first paint, since a client-only `useState` can't know the right
 * value until after mount). This just picks up what's already there.
 */
function readInitialTheme(): ThemePreference {
  if (typeof document === "undefined") return "light";
  const attr = document.documentElement.getAttribute("data-theme");
  return attr === "dark" ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>(readInitialTheme);

  const setTheme = useCallback((t: ThemePreference) => {
    setThemeState(t);
    window.localStorage.setItem(STORAGE_KEY, t);
    document.documentElement.setAttribute("data-theme", t);
  }, []);

  // Keep in sync if the OS-level preference changes and the user hasn't
  // made an explicit choice of their own yet.
  useEffect(() => {
    if (window.localStorage.getItem(STORAGE_KEY)) return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setThemeState(e.matches ? "dark" : "light");
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

/**
 * Inlined verbatim into `layout.tsx`'s `<head>` via `dangerouslySetInnerHTML`
 * (not imported/executed as a module -- it must run synchronously, before
 * first paint, which only a blocking inline `<script>` guarantees). Reads
 * the same `localStorage` key `ThemeProvider` above reads, falling back to
 * the OS-level `prefers-color-scheme` -- this is the one piece of the
 * theme system that has to duplicate logic rather than share it, since it
 * runs outside of React entirely.
 */
export const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem(${JSON.stringify(STORAGE_KEY)});
    var theme = stored === "dark" || stored === "light"
      ? stored
      : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {}
})();
`;
