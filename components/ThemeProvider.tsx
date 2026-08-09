"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  applyTheme,
  LAYOUT_PREF_KEY,
  readThemeCookie,
  type Theme,
  writeThemeCookie,
} from "@/lib/theme";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  compact: boolean;
  setCompact: (value: boolean) => void;
  ready: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [compact, setCompactState] = useState(false);
  const [ready, setReady] = useState(false);

  // Reads the saved preference from the cookie and localStorage on mount.
  //
  // This has to be an effect, and it has to set state synchronously: the server
  // cannot know the visitor's stored theme, so rendering the default first and
  // correcting it immediately on the client is what avoids a hydration
  // mismatch. Deferring the update would show the wrong theme for a frame.
  useEffect(() => {
    const fromCookie = readThemeCookie();
    const initial = fromCookie ?? "dark";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(initial);
    applyTheme(initial);
    if (!fromCookie) writeThemeCookie(initial);

    const storedCompact = localStorage.getItem(LAYOUT_PREF_KEY);
    setCompactState(storedCompact === "1");
    setReady(true);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyTheme(next);
    writeThemeCookie(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [setTheme, theme]);

  const setCompact = useCallback((value: boolean) => {
    setCompactState(value);
    localStorage.setItem(LAYOUT_PREF_KEY, value ? "1" : "0");
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme, compact, setCompact, ready }),
    [theme, setTheme, toggleTheme, compact, setCompact, ready],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
