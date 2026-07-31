import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  Shield,
  Loader2,
  LayoutDashboard,
  Trophy,
  Users,
  Megaphone,
  Medal,
  ScrollText,
  Image,
  History,
  UsersRound,
  Settings,
  Menu,
  X,
  Search,
  Bell,
  ChevronDown,
  LogOut,
} from "lucide-react";
import { SiteSettingsPanel } from "@/components/admin/SiteSettingsPanel";
import { TournamentsPanel } from "@/components/admin/TournamentsPanel";
import { AnnouncementsPanel } from "@/components/admin/AnnouncementsPanel";
import { HallOfFamePanel } from "@/components/admin/HallOfFamePanel";
import { HistoryPanel } from "@/components/admin/HistoryPanel";
import { GalleryPanel } from "@/components/admin/GalleryPanel";
import { SponsorsPanel } from "@/components/admin/SponsorsPanel";
import { CommunityLinksPanel } from "@/components/admin/CommunityLinksPanel";
import { OwnerModeratorsPanel } from "@/components/admin/OwnerModeratorsPanel";
import { UsersPanel } from "@/components/admin/UsersPanel";
import { ProfilePanel } from "@/components/admin/ProfilePanel";
import { DashboardOverview } from "@/components/admin/DashboardOverview";
import { cn } from "@/lib/utils";

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

type NavItem = {
  id: string;
  label: string;
  icon: React.ElementType;
  ownerOnly?: boolean;
};

const NAV: NavItem[] = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard },
  { id: "tournaments", label: "Tournaments", icon: Trophy },
  { id: "users", label: "Players / Users", icon: Users, ownerOnly: true },
  { id: "announcements", label: "Announcements", icon: Megaphone },
  { id: "hof", label: "Hall of Fame", icon: Medal },
  { id: "history", label: "History", icon: History },
  { id: "gallery", label: "Gallery", icon: Image },
  { id: "sponsors", label: "Sponsors", icon: ScrollText },
  { id: "community", label: "Community", icon: UsersRound },
  { id: "team", label: "Owner & Moderators", icon: Shield },
  { id: "site", label: "Site Settings", icon: Settings },
  { id: "profile", label: "My Profile", icon: Users },
];

function DashboardPage() {
  const { user, profile, loading, isAdmin, isOwner, signOut } = useAuth();
  const router = useRouter();
  const [active, setActive] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.navigate({ to: "/auth" });
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        <Loader2 className="h-7 w-7 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="max-w-md rounded-2xl border border-white/10 bg-slate-900 p-10 text-center">
          <Shield className="mx-auto h-10 w-10 text-blue-400" />
          <h1 className="mt-4 text-2xl font-bold text-white">Admins only</h1>
          <p className="mt-2 text-sm text-slate-400">
            This area is restricted to eFootball Nepal moderators and owner.
          </p>
          <Link to="/" className="mt-5 inline-block text-sm text-blue-400 hover:underline">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const visibleNav = NAV.filter((n) => !n.ownerOnly || isOwner);

  const renderPanel = () => {
    switch (active) {
      case "overview":
        return <DashboardOverview />;
      case "site":
        return <SiteSettingsPanel />;
      case "tournaments":
        return <TournamentsPanel />;
      case "announcements":
        return <AnnouncementsPanel />;
      case "hof":
        return <HallOfFamePanel />;
      case "history":
        return <HistoryPanel />;
      case "gallery":
        return <GalleryPanel />;
      case "sponsors":
        return <SponsorsPanel />;
      case "community":
        return <CommunityLinksPanel />;
      case "team":
        return <OwnerModeratorsPanel />;
      case "users":
        return isOwner ? <UsersPanel /> : null;
      case "profile":
        return <ProfilePanel />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/5 bg-slate-950 transition-transform duration-300 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-3 border-b border-white/5 px-5 py-5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 text-sm font-bold text-white">
            eF
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">eFootball Nepal</p>
            <p className="text-[10px] text-slate-500">Admin Panel</p>
          </div>
          <button
            type="button"
            className="ml-auto rounded-lg p-1 text-slate-400 hover:bg-white/5 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActive(item.id);
                  setSidebarOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition",
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-white/5 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-slate-900/80 px-3 py-2.5">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-xs font-bold text-white">
              {(profile?.username ?? user.email ?? "A").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">
                {profile?.username ?? user.email?.split("@")[0]}
              </p>
              <p className="text-[10px] text-slate-500">{isOwner ? "Owner" : "Moderator"}</p>
            </div>
            <button
              type="button"
              onClick={() => signOut()}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-rose-400"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/5 bg-slate-950/80 px-4 py-3 backdrop-blur-xl sm:px-6">
          <button
            type="button"
            className="rounded-lg p-2 text-slate-400 hover:bg-white/5 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="relative hidden max-w-md flex-1 sm:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              placeholder="Search players, tournaments..."
              className="w-full rounded-xl border border-white/5 bg-slate-900 py-2 pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-600 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button type="button" className="relative rounded-xl p-2 text-slate-400 hover:bg-white/5">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500" />
            </button>
            <div className="hidden items-center gap-2 rounded-xl border border-white/5 bg-slate-900 px-3 py-1.5 sm:flex">
              <div className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-[10px] font-bold text-white">
                {(profile?.username ?? "A").charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-medium text-slate-300">
                {profile?.username ?? "Admin"}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {active === "overview" && (
            <div className="mb-5">
              <h1 className="text-xl font-bold text-white sm:text-2xl">Dashboard</h1>
              <p className="text-sm text-slate-500">
                Welcome back, {profile?.username ?? user.email?.split("@")[0]} ·{" "}
                {isOwner ? "Owner" : "Moderator"}
              </p>
            </div>
          )}
          {renderPanel()}
        </main>
      </div>
    </div>
  );
  }
