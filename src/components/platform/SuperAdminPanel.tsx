import { useEffect, useState } from "react";
import { SuperAdminPanelImpl } from "./SuperAdminPanelImpl";
import { GaAnalyticsDashboard } from "./GaAnalyticsDashboard";
import { PageShell } from "@/components/PageShell";
import { useAuth } from "@/hooks/useAuth";
import { isSuperAdminEmail, PLATFORM_NAME } from "@/lib/organizers";
import { Link } from "@tanstack/react-router";
import { BarChart3, ArrowLeft, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Super Admin shell — supports dedicated Analytics view at /platform#analytics
 * (and ?tab=analytics) without forking the full panel implementation.
 */
export function SuperAdminPanel() {
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"panel" | "analytics">("panel");

  useEffect(() => {
    const read = () => {
      if (typeof window === "undefined") return;
      const hash = window.location.hash.replace("#", "");
      const q = new URLSearchParams(window.location.search).get("tab");
      setMode(hash === "analytics" || q === "analytics" ? "analytics" : "panel");
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  if (loading) {
    return (
      <PageShell force="platform">
        <div className="grid min-h-[70vh] place-items-center">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    );
  }

  if (!isSuperAdminEmail(user?.email)) {
    return <SuperAdminPanelImpl />;
  }

  if (mode === "analytics") {
    return (
      <PageShell force="platform">
        <div className="border-b border-white/10 bg-black/60">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-2 text-sm">
              <BarChart3 className="h-4 w-4 text-sky-400" />
              <span className="font-semibold">{PLATFORM_NAME} Analytics</span>
              <span className="hidden text-neutral-500 sm:inline">· GA4 live</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-white/15"
              onClick={() => {
                window.location.hash = "";
                setMode("panel");
              }}
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Dashboard
            </Button>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="mb-2 flex items-center gap-2 text-xs text-neutral-500">
            <Shield className="h-3.5 w-3.5" /> Owner-only · secrets stay on server
          </div>
          <GaAnalyticsDashboard />
        </div>
      </PageShell>
    );
  }

  return (
    <>
      <div className="sticky top-14 z-30 border-b border-white/5 bg-black/50 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-1.5">
          <Link
            to="/platform"
            hash="analytics"
            onClick={() => setMode("analytics")}
            className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/15 px-3 py-1 text-xs font-medium text-sky-300 ring-1 ring-sky-500/30 transition hover:bg-sky-500/25"
          >
            <BarChart3 className="h-3.5 w-3.5" /> Open GA4 Analytics
          </Link>
        </div>
      </div>
      <SuperAdminPanelImpl />
    </>
  );
}
