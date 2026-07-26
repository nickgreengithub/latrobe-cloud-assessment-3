export type Theme = "dark" | "light";

export const THEME_COOKIE = "rss_lms_theme";
export const LAYOUT_PREF_KEY = "rss_lms_compact";

export function isTheme(value: string | null | undefined): value is Theme {
  return value === "dark" || value === "light";
}

export function readThemeCookie(): Theme | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${THEME_COOKIE}=`));
  const value = match?.split("=")[1];
  return isTheme(value) ? value : null;
}

export function writeThemeCookie(theme: Theme) {
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}
