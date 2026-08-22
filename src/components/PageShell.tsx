import { useEffect, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { BottomNav } from "./BottomNav";
import { ThemeChooser } from "./ThemeChooser";
import { isPlatformPath } from "@/lib/shell-mode";
import {
  applyOrganizerThemeVars,
  getOrganizerThemeContext,
} from "@/lib/organizer-context";
import { getTheme } from "@/lib/themes";

export function PageShell({
  children,
  force,
  hideChrome = false,
}: {
  children: ReactNode;
  force?: "platform" | "organizer";
  /** Hide site Header/Footer — BottomNav still decides visibility itself */
  hideChrome?: boolean;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const mode =
    force ?? (isPlatformPath(pathname) ? "platform" : "organizer");

  useEffect(() => {
    if (mode === "organizer") {
      const ctx = getOrganizerThemeContext();
      if (ctx?.theme_id || ctx?.primary_color) {
        const preset = getTheme(ctx.theme_id, {
          start: ctx.primary_color,
          end: ctx.secondary_color,
          accent: ctx.secondary_color || ctx.primary_color,
        });
        applyOrganizerThemeVars({
          ...ctx,
          primary_color: ctx.primary_color || preset.swatch[0],
          secondary_color: ctx.secondary_color || preset.swatch[1],
        });
      } else {
        applyOrganizerThemeVars(ctx);
      }
    } else {
      applyOrganizerThemeVars(null);
    }
  }, [mode, pathname]);

  const showBottomNav = true;
  const padBottom =
    showBottomNav &&
    !pathname.startsWith("/auth") &&
    !pathname.startsWith("/reset-password") &&
    !pathname.startsWith("/dashboard") &&
    !pathname.startsWith("/platform");

  return (
    <div
      className={`min-h-screen flex flex-col bg-background text-foreground ${
        mode === "organizer" ? "bg-[image:var(--org-page-bg)]" : ""
      }`}
      style={
        mode === "organizer"
          ? {
              backgroundImage: "var(--org-page-bg)",
            }
          : undefined
      }
    >
      {!hideChrome && <Header mode={mode} />}
      <main className={`flex-1 ${padBottom ? "pb-20" : ""}`}>{children}</main>
      {!hideChrome && <Footer mode={mode} />}
      {showBottomNav && <BottomNav />}
      <ThemeChooser />
    </div>
  );
}
