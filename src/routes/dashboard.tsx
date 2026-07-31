import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { PageShell } from "@/components/PageShell";

import {
  Shield,
  Loader2,
  Home,
  Trophy,
  Megaphone,
  Image,
  History,
  Award,
  Users,
  Globe,
  Settings,
  User,
  ChevronDown,
  ChevronRight,
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

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  component: DashboardPage,
});

function DashboardPage() {
  const { user, loading, isAdmin, isOwner } = useAuth();
  const router = useRouter();

  const [page, setPage] = useState("dashboard");
  const [openTournament, setOpenTournament] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.navigate({ to: "/auth" });
    }
  }, [loading, user]);

  if (loading || !user) {
    return (
      <PageShell>
        <div className="min-h-[70vh] grid place-items-center">
          <Loader2 className="h-7 w-7 animate-spin" />
        </div>
      </PageShell>
    );
  }

  if (!isAdmin) {
    return (
      <PageShell>
        <div className="max-w-xl mx-auto py-20 text-center">
          <Shield className="h-10 w-10 mx-auto text-brand" />
          <h1 className="text-3xl font-bold mt-4">
            Admin Access Only
          </h1>

          <p className="text-muted-foreground mt-3">
            You don't have permission to access this page.
          </p>

          <Link
            to="/"
            className="text-brand mt-5 inline-block"
          >
            ← Back Home
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="max-w-7xl mx-auto px-4 py-8">

        <div className="flex items-center gap-3 mb-8">
          <div className="h-11 w-11 rounded-xl bg-gradient-brand grid place-items-center">
            <Shield className="h-5 w-5 text-white" />
          </div>

          <div>
            <h1 className="text-3xl font-bold">
              Admin Dashboard
            </h1>

            <p className="text-xs text-muted-foreground">
              {user.email} • {isOwner ? "Owner" : "Moderator"}
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-[260px_1fr] gap-6">

          {/* Sidebar */}

          <aside className="glass rounded-2xl p-4 h-fit">

            <button
              onClick={() => setPage("dashboard")}
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 ${
                page === "dashboard"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              }`}
            >
              <Home className="h-4 w-4" />
              Dashboard
            </button>

            <button
              onClick={() =>
                setOpenTournament(!openTournament)
              }
              className="w-full flex items-center justify-between rounded-lg px-3 py-2 hover:bg-accent mt-2"
            >
              <div className="flex items-center gap-3">
                <Trophy className="h-4 w-4" />
                Tournament Manager
              </div>

              {openTournament ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>

            {openTournament && (
              <div className="ml-7 mt-2 space-y-1">

                <button
                  onClick={() => setPage("tournaments")}
                  className="block w-full text-left px-3 py-2 rounded hover:bg-accent"
                >
                  Players
                </button>

                <button
                  onClick={() => setPage("fixtures")}
                  className="block w-full text-left px-3 py-2 rounded hover:bg-accent"
                >
                  Fixtures
                </button>

                <button
                  onClick={() => setPage("results")}
                  className="block w-full text-left px-3 py-2 rounded hover:bg-accent"
                >
                  Results
                </button>

                <button
                  onClick={() => setPage("standings")}
                  className="block w-full text-left px-3 py-2 rounded hover:bg-accent"
                >
                  Standings
                </button>

              </div>
            )}
                        <button
              onClick={() => setPage("announcements")}
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 mt-2 ${
                page === "announcements"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              }`}
            >
              <Megaphone className="h-4 w-4" />
              Announcements
            </button>

            <button
              onClick={() => setPage("hof")}
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 mt-2 ${
                page === "hof"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              }`}
            >
              <Award className="h-4 w-4" />
              Hall of Fame
            </button>

            <button
              onClick={() => setPage("history")}
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 mt-2 ${
                page === "history"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              }`}
            >
              <History className="h-4 w-4" />
              History
            </button>

            <button
              onClick={() => setPage("gallery")}
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 mt-2 ${
                page === "gallery"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              }`}
            >
              <Image className="h-4 w-4" />
              Gallery
            </button>

            <button
              onClick={() => setPage("sponsors")}
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 mt-2 ${
                page === "sponsors"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              }`}
            >
              <Award className="h-4 w-4" />
              Sponsors
            </button>

            <button
              onClick={() => setPage("community")}
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 mt-2 ${
                page === "community"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              }`}
            >
              <Users className="h-4 w-4" />
              Community
            </button>

            <button
              onClick={() => setPage("site")}
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 mt-2 ${
                page === "site"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              }`}
            >
              <Globe className="h-4 w-4" />
              Website
            </button>

            <button
              onClick={() => setPage("team")}
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 mt-2 ${
                page === "team"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              }`}
            >
              <Settings className="h-4 w-4" />
              Team
            </button>

            {isOwner && (
              <button
                onClick={() => setPage("users")}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 mt-2 ${
                  page === "users"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                }`}
              >
                <Users className="h-4 w-4" />
                Users & Roles
              </button>
            )}

            <button
              onClick={() => setPage("profile")}
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 mt-2 ${
                page === "profile"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              }`}
            >
              <User className="h-4 w-4" />
              My Profile
            </button>

          </aside>

          {/* Content */}

          <main className="glass rounded-2xl p-6">
            {page === "dashboard" && (
              <div>
                <h2 className="text-2xl font-bold">
                  Welcome to Admin Dashboard
                </h2>

                <p className="text-muted-foreground mt-2">
                  Select an option from the left sidebar to manage the website.
                </p>
              </div>
            )}

            {page === "site" && <SiteSettingsPanel />}

            {(page === "tournaments" ||
              page === "fixtures" ||
              page === "results" ||
              page === "standings") && (
              <TournamentsPanel />
            )}

            {page === "announcements" && <AnnouncementsPanel />}
            {page === "hof" && <HallOfFamePanel />}
            {page === "history" && <HistoryPanel />}
            {page === "gallery" && <GalleryPanel />}
            {page === "sponsors" && <SponsorsPanel />}
            {page === "community" && <CommunityLinksPanel />}
            {page === "team" && <OwnerModeratorsPanel />}
            {isOwner && page === "users" && <UsersPanel />}
            {page === "profile" && <ProfilePanel />}
                      </main>

        </div>
      </div>
    </PageShell>
  );
}
