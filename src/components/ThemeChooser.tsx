/**
 * First-visit theme picker + reusable applyTheme helper.
 * Dark (black/silver) or Light (cream + soft teal accents).
 */
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export type ThemeMode = "dark" | "light";

const STORAGE_KEY = "neparena-theme";

export function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === "light") {
    root.classList.add("light");
    root.classList.remove("dark");
    root.style.colorScheme = "light";
  } else {
    root.classList.add("dark");
    root.classList.remove("light");
    root.style.colorScheme = "dark";
  }
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* private mode */
  }
}

export function readTheme(): ThemeMode | null {
  try {
    const t = localStorage.getItem(STORAGE_KEY);
    if (t === "light" || t === "dark") return t;
  } catch {
    /* ignore */
  }
  return null;
}

/** Full-screen chooser shown once when no theme is saved */
export function ThemeChooser() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (readTheme() == null) setOpen(true);
    }, 400);
    return () => clearTimeout(id);
  }, []);

  if (!open) return null;

  const pick = (mode: ThemeMode) => {
    applyTheme(mode);
    setOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal
      aria-label="Choose theme"
    >
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#141414] p-6 shadow-2xl">
        <h2 className="text-center text-lg font-bold text-white">
          Choose your look
        </h2>
        <p className="mt-1 text-center text-sm text-neutral-400">
          You can change this anytime in Settings
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => pick("dark")}
            className={cn(
              "flex flex-col items-center gap-3 rounded-xl border border-white/15 bg-[#0a0a0a] px-3 py-5",
              "transition hover:border-sky-400/50 hover:bg-white/[0.04] active:scale-[0.98]",
            )}
          >
            <span className="grid h-12 w-12 place-items-center rounded-full bg-neutral-800">
              <Moon className="h-6 w-6 text-neutral-200" />
            </span>
            <span className="text-sm font-semibold text-white">Dark</span>
            <span className="text-[10px] text-neutral-500">Black & silver</span>
          </button>
          <button
            type="button"
            onClick={() => pick("light")}
            className={cn(
              "flex flex-col items-center gap-3 rounded-xl border border-[#d9cfbc] bg-[#f3efe6] px-3 py-5",
              "transition hover:border-teal-600/40 active:scale-[0.98]",
            )}
          >
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[#2f4a4a]">
              <Sun className="h-6 w-6 text-[#f7f3ea]" />
            </span>
            <span className="text-sm font-semibold text-[#14120f]">Light</span>
            <span className="text-[10px] text-[#6b6458]">Cream & soft teal</span>
          </button>
        </div>
      </div>
    </div>
  );
}
