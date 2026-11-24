"use client";

import { useEffect, useSyncExternalStore } from "react";
import { isThemePreference, resolveDark, THEME_STORAGE_KEY, type ThemePreference } from "@/lib/theme";

const OPTIONS: { value: ThemePreference; label: string; hint: string }[] = [
  { value: "system", label: "System", hint: "Match this device" },
  { value: "light", label: "Light", hint: "Always light" },
  { value: "dark", label: "Dark", hint: "Always dark" },
];

const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}
function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

function apply(preference: ThemePreference) {
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.classList.toggle("dark", resolveDark(preference, systemDark));
}

export function ThemePicker() {
  const preference = useSyncExternalStore(subscribe, readPreference, () => "system" as ThemePreference);

  // While "System" is chosen, follow the device if it switches (e.g. at sunset).
  useEffect(() => {
    if (preference !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [preference]);

  function choose(next: ThemePreference) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private mode: still apply for this visit.
    }
    apply(next);
    listeners.forEach((l) => l());
  }

  return (
    <fieldset>
      <legend className="sr-only">Appearance</legend>
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((o) => (
          <label
            key={o.value}
            className="flex min-h-16 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-control border border-line-strong bg-surface px-2 py-2 text-center text-small transition-colors duration-150 hover:bg-subtle has-checked:border-brand has-checked:bg-brand-soft has-focus-visible:outline-2 has-focus-visible:outline-brand"
          >
            <input
              type="radio"
              name="theme"
              value={o.value}
              checked={preference === o.value}
              onChange={() => choose(o.value)}
              className="sr-only"
            />
            <span className="font-medium text-fg">{o.label}</span>
            <span className="text-caption text-fg-muted">{o.hint}</span>
          </label>
        ))}
      </div>
      <p className="mt-2 text-caption text-fg-subtle">Saved on this device.</p>
    </fieldset>
  );
}
