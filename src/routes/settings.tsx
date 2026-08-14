/**
 * User settings — theme switch (dark / light) + basic account links.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { PlatformTopBar } from "@/components/PlatformTopBar";
import { useAuth } from "@/hooks/useAuth";
import { buildSeoHead } from "@/lib/seo";
import { Moon, Sun, ArrowLeft, User, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  ssr: false,
  head: () => ({
    ...buildSeoHead({
      title: "Settings — NepARENA",
      description: "Account and appearance settings",
      path: "/settings",
    }),
  }),
  component: SettingsPage,
});

type ThemeMode = "dark" | "light";

function applyTheme(mode: ThemeMode) {
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
    localStorage.setItem("neparena-theme", mode);
  } catch {
    /* ignore */
  }
}

function SettingsPage() {
  const { user, signOut } = useAuth();
  const [theme, setTheme] = useState<ThemeMode>("dark");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("neparena-theme") as ThemeMode | null;
      if (saved === "light" || saved === "dark") {
        setTheme(saved);
        applyTheme(saved);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const pickTheme = (mode: ThemeMode) => {
    setTheme(mode);
    applyTheme(mode);
    toast.success(mode === "dark" ? "Dark theme on" : "Light theme on");
  };

  return (
    <PageShell force="platform" hideChrome>
      <PlatformTopBar showLogo={false} pageTitle="Settings" />
      <div className="mx-auto max-w-lg space-y-6 px-4 pb-28 pt-4">
        <Link
          to={user ? "/members/$id" : "/"}
          params={user ? { id: user.id } : undefined}
          className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <h2 className="mb-3 text-sm font-semibold text-white">Appearance</h2>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => pickTheme("dark")}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border px-3 py-4 transition",
                theme === "dark"
                  ? "border-sky-400/50 bg-sky-500/10 text-white"
                  : "border-white/10 bg-white/[0.02] text-neutral-400 hover:bg-white/[0.05]",
              )}
            >
              <Moon className="h-5 w-5" />
              <span className="text-xs font-semibold">Dark</span>
            </button>
            <button
              type="button"
              onClick={() => pickTheme("light")}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border px-3 py-4 transition",
                theme === "light"
                  ? "border-sky-400/50 bg-sky-500/10 text-white"
                  : "border-white/10 bg-white/[0.02] text-neutral-400 hover:bg-white/[0.05]",
              )}
            >
              <Sun className="h-5 w-5" />
              <span className="text-xs font-semibold">Light</span>
            </button>
          </div>
          <p className="mt-3 text-[11px] text-neutral-500">
            Theme is saved on this device. Full light palette is still being refined.
          </p>
        </section>

        {user && (
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <h2 className="mb-3 text-sm font-semibold text-white">Account</h2>
            <div className="space-y-1">
              <Link
                to="/members/$id"
                params={{ id: user.id }}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-neutral-200 hover:bg-white/[0.05]"
              >
                <User className="h-4 w-4 text-sky-400" /> View profile
              </Link>
              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  window.location.href = "/";
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-rose-300 hover:bg-white/[0.05]"
              >
                <LogOut className="h-4 w-4" /> Log out
              </button>
            </div>
          </section>
        )}
      </div>
    </PageShell>
  );
}
