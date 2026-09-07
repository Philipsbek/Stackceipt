"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

export type Theme = "light" | "dark";

/** localStorage key — kept in sync with the inline boot script in the root layout. */
export const THEME_STORAGE_KEY = "stackceipt-theme";

type ThemeContextValue = {
  theme: Theme;
  toggle: () => void;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    // Private mode / blocked storage — fall back to light.
  }
  return "light";
}

/**
 * Theme state for the app. Dark mode is scoped to the authenticated product
 * (`/app/*`): the `.dark` class is only applied to <html> while on those routes,
 * so the public marketing pages keep their bespoke light design regardless of the
 * saved preference. The preference itself is remembered across sessions.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Lazy init from storage. The value isn't rendered into markup (only the
  // toggle icon reads it, and that waits for mount), so no hydration mismatch.
  const [theme, setThemeState] = React.useState<Theme>(readStoredTheme);

  const inApp = pathname?.startsWith("/app") ?? false;

  React.useEffect(() => {
    const root = document.documentElement;
    if (inApp && theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [theme, inApp]);

  const transitionTimer = React.useRef<number | undefined>(undefined);
  React.useEffect(() => () => window.clearTimeout(transitionTimer.current), []);

  const setTheme = React.useCallback((next: Theme) => {
    // Briefly enable a color cross-fade — only for this deliberate switch, so the
    // initial load and route changes stay instant.
    const root = document.documentElement;
    root.classList.add("theme-transition");
    window.clearTimeout(transitionTimer.current);
    transitionTimer.current = window.setTimeout(
      () => root.classList.remove("theme-transition"),
      180,
    );

    setThemeState(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Ignore write failures (private mode); the in-memory state still applies.
    }
  }, []);

  const toggle = React.useCallback(
    () => setTheme(theme === "dark" ? "light" : "dark"),
    [theme, setTheme],
  );

  const value = React.useMemo(() => ({ theme, toggle, setTheme }), [theme, toggle, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
