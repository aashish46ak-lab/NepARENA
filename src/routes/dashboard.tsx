import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { PageShell } from "@/components/PageShell";
import {
  Shield,
  Loader2,
  Trophy,
  Users,
  Settings,
  LayoutDashboard,
} from "lucide-react";
import { UsersPanel } from "@/components/admin/UsersPanel";
import { SiteSettingsPanel } from "@/components/admin/SiteSettingsPanel";
import { TournamentsPanel } from "@/components/admin/TournamentsPanel";
import { DashboardOverview } from "@/components/admin/DashboardOverview";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin — eFootball Nepal" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user, loading, isAdmin, isOwner } = useAuth();
  const router = useRouter();
  const [section, setSection] = useState<"dashboard" | "tournaments" | "players" | "settings">(
    "dashboard",
  );

  useEffect(() => {
    if (!loading && !user) {
      router.navigate({ to: "/auth" });
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <PageShell>
        <div className="grid min-h-[70vh] place-items-center">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    );
  }

  if (!isAdmin) {
    return (
      <PageShell>
        <div className="mx-auto max-w-xl py-20 text-center">
          <Shield className="mx-auto h-10 w-10 text-brand" />
          <h1 className="mt-4 text-3xl font-bold">Admin Access Only</h1>
          <Link to="/" className="mt-5 inline-block text-brand">
            Back Home
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-brand">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              {user.email} · {isOwner ? "Owner" : "Moderator"}
            </p>
          </div>
        </div>

        <nav className="flex flex-wrap gap-2">
          <NavButton
            active={section === "dashboard"}
            onClick={() => setSection("dashboard")}
            icon={<LayoutDashboard size={18} />}
            text="Dashboard"
          />
          <NavButton
            active={section === "tournaments"}
            onClick={() => setSection("tournaments")}
            icon={<Trophy size={18} />}
            text="Tournaments"
          />
          {isOwner && (
            <NavButton
              active={section === "players"}
              onClick={() => setSection("players")}
              icon={<Users size={18} />}
              text="Players"
            />
          )}
          <NavButton
            active={section === "settings"}
            onClick={() => setSection("settings")}
            icon={<Settings size={18} />}
            text="Settings"
          />
        </nav>

        <main className="glass rounded-2xl p-4 sm:p-6">
          {section === "dashboard" && <DashboardOverview />}
          {section === "tournaments" && <TournamentsPanel />}
          {section === "players" && isOwner && <UsersPanel />}
          {section === "settings" && <SiteSettingsPanel />}
        </main>
      </div>
    </PageShell>
  );
}

function NavButton({
  active,
  onClick,
  icon,
  text,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  text: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-4 py-2 transition ${
        active ? "bg-primary text-primary-foreground" : "hover:bg-accent"
      }`}
    >
      {icon}
      {text}
    </button>
  );
}
