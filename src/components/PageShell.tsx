import type { ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { isPlatformPath } from "@/lib/shell-mode";

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

  return (
    <div
      className={`min-h-screen flex flex-col ${
        mode === "platform" ? "bg-[#0a0a0a] text-neutral-100" : ""
      }`}
    >
      <Header mode={mode} />
      <main className="flex-1">{children}</main>
      <Footer mode={mode} />
    </div>
  );
}
