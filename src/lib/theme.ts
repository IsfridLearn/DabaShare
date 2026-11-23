// Appearance preference, stored per device (localStorage). "system" follows
// the phone/computer setting.
export type ThemePreference = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "dabashare-theme";

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

export function resolveDark(preference: ThemePreference, systemPrefersDark: boolean): boolean {
  return preference === "dark" || (preference === "system" && systemPrefersDark);
}

// Runs in <head> before the page paints, so dark mode never flashes white.
// Static string with no user input.
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem("${THEME_STORAGE_KEY}");var d=p==="dark"||(p!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;
