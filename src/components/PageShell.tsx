import { useEffect, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { isPlatformPath } from "@/lib/shell-mode";
import {
  applyOrganizerThemeVars,
  getOrganizerThemeContext,
} from "@/lib/organizer-context";

export function PageShell({
  children,
  force,
}: {
  children: ReactNode;
  force?: "platform" | "organizer";
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const mode =
    force ?? (isPlatformPath(pathname) ? "platform" : "organizer");

  useEffect(() => {
    if (mode === "organizer") {
      applyOrganizerThemeVars(getOrganizerThemeContext());
    } else {
      // Platform pages keep default brand; clear org theme vars
      applyOrganizerThemeVars(null);
    }
  }, [mode, pathname]);

  return (
    <div
      className={`min-h-screen flex flex-col ${
        mode === "platform"
          ? "bg-[#0a0a0a] text-neutral-100"
          : "bg-[image:var(--org-page-bg)] bg-[#0a0a0a] text-neutral-100"
      }`}
      style={
        mode === "organizer"
          ? {
              backgroundImage: "var(--org-page-bg)",
              backgroundColor: "#0a0a0a",
            }
          : undefined
      }
    >
      <Header mode={mode} />
      <main className="flex-1">{children}</main>
      <Footer mode={mode} />
    </div>
  );
}
