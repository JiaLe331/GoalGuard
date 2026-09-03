export const themeCookieName = "goalguard-theme";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = Exclude<ThemePreference, "system">;

export function isThemePreference(value: string | null | undefined): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

export function readThemeCookie(cookie = typeof document === "undefined" ? "" : document.cookie): ThemePreference {
  const match = cookie.match(new RegExp(`(?:^|; )${themeCookieName}=([^;]*)`));
  const value = match ? decodeURIComponent(match[1] ?? "") : null;
  return value === "light" || value === "dark" ? value : "system";
}

export function resolveTheme(preference: ThemePreference, systemDark: boolean): ResolvedTheme {
  return preference === "system" ? (systemDark ? "dark" : "light") : preference;
}

export const themeBootScript = `(()=>{try{var m=document.cookie.match(/(?:^|; )${themeCookieName}=([^;]*)/);var p=m?decodeURIComponent(m[1]):"system";var t=p==="dark"||p==="light"?p:(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t}catch(e){}})()`;
