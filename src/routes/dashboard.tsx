import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState, type ElementType } from "react";
import { useAuth } from "@/hooks/useAuth";
import { PageShell } from "@/components/PageShell";
import { cn } from "@/lib/utils";
import {
  Shield, Loader2, Trophy, Users, Settings, LayoutDashboard, Megaphone,
  Award, History, Images, Handshake, Link2, ShieldCheck, Flag, MessageCircle,
} from "lucide-react";
import { DashboardOverview } from "@/components/admin/DashboardOverview";
import { TournamentsPanel } from "@/components/admin/TournamentsPanel";
import { UsersPanel } from "@/components/admin/UsersPanel";
import { AnnouncementsPanel } from "@/components/admin/AnnouncementsPanel";
import { HallOfFamePanel } from "@/components/admin/HallOfFamePanel";
import { HistoryPanel } from "@/components/admin/HistoryPanel";
import { GalleryPanel } from "@/components/admin/GalleryPanel";
import { SponsorsPanel } from "@/components/admin/SponsorsPanel";
import { CommunityLinksPanel } from "@/components/admin/CommunityLinksPanel";
import { OwnerModeratorsPanel } from "@/components/admin/OwnerModeratorsPanel";
import { ReportsPanel } from "@/components/admin/ReportsPanel";
import { SiteSettingsPanel } from "@/components/admin/SiteSettingsPanel";
import { MessagesInbox } from "@/components/MessagesInbox";
import { getDefaultOrganizer } from "@/lib/organizers";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { t: string } => ({
    t: typeof search.t === "string" ? search.t : "dashboard",
  }),
  head: () => ({
    meta: [
      { title: "Admin — Organizer Dashboard" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

interface Section {
  id: string;
  label: string;
  icon: ElementType;
  ownerOnly?: boolean;
}

const SECTIONS: Section[] = [
  { id: "dashboard", label: "Overview", icon: LayoutDashboard },
  { id: "messages", label: "Messages", icon: MessageCircle },
  { id: "tournaments", label: "Tournaments", icon: Trophy },
  { id: "players", label: "Players", icon: Users, ownerOnly: true },
  { id: "reports", label: "Reports", icon: Flag },
  { id: "announcements", label: "Announcements", icon: Megaphone },
  { id: "hall-of-fame", label: "Hall of Fame", icon: Award },
  { id: "history", label: "History", icon: History },
  { id: "gallery", label: "Gallery", icon: Images },
  { id: "sponsors", label: "Sponsors", icon: Handshake },
  { id: "community", label: "Community Links", icon: Link2 },
  { id: "team", label: "Owner & Moderators", icon: ShieldCheck },
  { id: "settings", label: "Site Settings", icon: Settings },
];

const MOD_ALLOWED = new Set(["tournaments", "reports", "announcements", "messages"]);

function DashboardPage() {
  const { user, loading, isAdmin, isOwner, roles } = useAuth();
  const router = useRouter();
  const navigate = useNavigate({ from: "/dashboard" });
  const { t } = Route.useSearch();
  const [orgId, setOrgId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.navigate({ to: "/auth" });
    }
  }, [loading, user, router]);

  useEffect(() => {
    void getDefaultOrganizer().then((o) => setOrgId(o?.id ?? null));
  }, []);

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

  const isModeratorOnly =
    !isOwner && roles.includes("moderator") && !roles.includes("admin");
  const roleLabel = isOwner
    ? "Owner"
    : roles.includes("admin")
      ? "Admin"
      : "Moderator";

  const visible = SECTIONS.filter((s) =>
    isModeratorOnly ? MOD_ALLOWED.has(s.id) : !s.ownerOnly || isOwner,
  );
  const active = visible.some((s) => s.id === t)
    ? t
    : (visible[0]?.id ?? "dashboard");

  return (
    <PageShell>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-brand">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">Organizer Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              {user.email} · {roleLabel}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="hidden w-60 shrink-0 lg:block">
            <nav className="glass sticky top-20 space-y-1 rounded-2xl p-3">
              {visible.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => navigate({ search: { t: s.id } })}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition",
                    active === s.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <s.icon className="h-4 w-4 shrink-0" />
                  {s.label}
                </button>
              ))}
            </nav>
          </aside>

          <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {visible.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => navigate({ search: { t: s.id } })}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition",
                  active === s.id
                    ? "bg-primary text-primary-foreground"
                    : "glass text-muted-foreground",
                )}
              >
                <s.icon className="h-4 w-4" />
                {s.label}
              </button>
            ))}
          </div>

          <main className="min-w-0 flex-1">
            {active === "dashboard" && <DashboardOverview />}
            {active === "messages" && (
              orgId ? (
                <MessagesInbox mode="organizer" organizerId={orgId} />
              ) : (
                <div className="grid place-items-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )
            )}
            {active === "tournaments" && <TournamentsPanel />}
            {active === "players" && isOwner && <UsersPanel />}
            {active === "reports" && <ReportsPanel />}
            {active === "announcements" && <AnnouncementsPanel />}
            {active === "hall-of-fame" && <HallOfFamePanel />}
            {active === "history" && <HistoryPanel />}
            {active === "gallery" && <GalleryPanel />}
            {active === "sponsors" && <SponsorsPanel />}
            {active === "community" && <CommunityLinksPanel />}
            {active === "team" && <OwnerModeratorsPanel />}
            {active === "settings" && <SiteSettingsPanel />}
          </main>
        </div>
      </div>
    </PageShell>
  );
}
