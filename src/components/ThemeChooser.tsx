/**
 * Dark-only platform — helpers kept for any leftover imports.
 */
export type ThemeMode = "dark" | "light";

const STORAGE_KEY = "neparena-theme";

export function applyTheme(_mode?: ThemeMode) {
  const root = document.documentElement;
  root.classList.add("dark");
  root.classList.remove("light");
  root.style.colorScheme = "dark";
  try {
    localStorage.setItem(STORAGE_KEY, "dark");
  } catch {
    /* private mode */
  }
}

export function readTheme(): ThemeMode {
  return "dark";
}

/** Theme picker disabled — dark only */
export function ThemeChooser() {
  return null;
}
