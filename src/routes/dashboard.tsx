import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { PageShell } from "@/components/PageShell";

import {
  Shield,
  Loader2,
  Trophy,
  Users,
  Settings,
  ShieldCheck,
  BarChart3,
  TrendingUp,
  Plus,
} from "lucide-react";

import { SiteSettingsPanel } from "@/components/admin/SiteSettingsPanel";
import { TournamentsPanel } from "@/components/admin/TournamentsPanel";
import { HallOfFamePanel } from "@/components/admin/HallOfFamePanel";
import { HistoryPanel } from "@/components/admin/HistoryPanel";
import { UsersPanel } from "@/components/admin/UsersPanel";


export const Route = createFileRoute("/dashboard")({
  ssr: false,
  component: DashboardPage,
});


function DashboardPage() {

  const { user, loading, isAdmin, isOwner } = useAuth();
  const router = useRouter();

  const [section, setSection] = useState("dashboard");


  useEffect(() => {
    if (!loading && !user) {
      router.navigate({
        to: "/auth",
      });
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


        <div className="grid lg:grid-cols-[220px_1fr] gap-6">


          <aside className="glass rounded-2xl p-4 h-fit">

            <button
              onClick={() => setSection("dashboard")}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent"
            >
              <BarChart3 className="h-4 w-4"/>
              Dashboard
            </button>


            <button
              onClick={() => setSection("tournament")}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent mt-2"
            >
              <Trophy className="h-4 w-4"/>
              Tournament Manager
            </button>
                        <button
              onClick={() => setSection("members")}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent mt-2"
            >
              <Users className="h-4 w-4"/>
              Members
            </button>


            <button
              onClick={() => setSection("roles")}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent mt-2"
            >
              <ShieldCheck className="h-4 w-4"/>
              Roles & Permissions
            </button>


            <button
              onClick={() => setSection("settings")}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent mt-2"
            >
              <Settings className="h-4 w-4"/>
              Settings
            </button>

          </aside>



          <main className="glass rounded-2xl p-6">


            {section === "dashboard" && (
              <div>

                <div className="flex justify-between items-center mb-6">

                  <div>
                    <h2 className="text-2xl font-bold">
                      Dashboard Overview
                    </h2>

                    <p className="text-muted-foreground">
                      Website and tournament analytics
                    </p>
                  </div>

                </div>


                <div className="grid md:grid-cols-4 gap-4">


                  <div className="rounded-xl border p-4">

                    <Users className="h-5 w-5 mb-3"/>

                    <p className="text-sm text-muted-foreground">
                      Total Members
                    </p>

                    <h3 className="text-2xl font-bold">
                      0
                    </h3>

                  </div>



                  <div className="rounded-xl border p-4">

                    <TrendingUp className="h-5 w-5 mb-3"/>

                    <p className="text-sm text-muted-foreground">
                      Followers Growth
                    </p>

                    <h3 className="text-2xl font-bold">
                      0%
                    </h3>

                  </div>



                  <div className="rounded-xl border p-4">

                    <Trophy className="h-5 w-5 mb-3"/>

                    <p className="text-sm text-muted-foreground">
                      Total Tournaments
                    </p>

                    <h3 className="text-2xl font-bold">
                      0
                    </h3>

                  </div>



                  <div className="rounded-xl border p-4">

                    <BarChart3 className="h-5 w-5 mb-3"/>

                    <p className="text-sm text-muted-foreground">
                      Ongoing Tournaments
                    </p>

                    <h3 className="text-2xl font-bold">
                      0
                    </h3>

                  </div>


                </div>



                <div className="grid md:grid-cols-2 gap-6 mt-6">


                  <div className="rounded-xl border p-6 h-60">

                    <h3 className="font-bold mb-3">
                      Members Growth
                    </h3>

                    <div className="h-full grid place-items-center text-muted-foreground">
                      Graph Area
                    </div>

                  </div>



                  <div className="rounded-xl border p-6 h-60">

                    <h3 className="font-bold mb-3">
                      Tournament Progress
                    </h3>

                    <div className="h-full grid place-items-center text-muted-foreground">
                      Graph Area
                    </div>

                  </div>


                </div>


              </div>
            )}
                        {section === "tournament" && (
              <div>

                <div className="flex items-center justify-between mb-6">

                  <div>
                    <h2 className="text-2xl font-bold">
                      Tournament Manager
                    </h2>

                    <p className="text-muted-foreground">
                      Manage tournaments, fixtures and records
                    </p>
                  </div>


                  <button
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground"
                  >
                    <Plus className="h-4 w-4"/>
                    Create Tournament
                  </button>

                </div>



                <div className="space-y-4">


                  <div className="rounded-xl border p-5 flex items-center justify-between">


                    <div>

                      <h3 className="font-bold">
                        eFootball League
                      </h3>

                      <p className="text-sm text-muted-foreground">
                        2026 Season
                      </p>

                    </div>


                    <div className="flex items-center gap-3">


                      <span className="px-3 py-1 rounded-full text-xs bg-green-500/20 text-green-500">
                        Ongoing
                      </span>


                      <button className="px-3 py-1 rounded-lg border text-sm">
                        Manage
                      </button>


                    </div>


                  </div>




                  <div className="rounded-xl border p-5 flex items-center justify-between">


                    <div>

                      <h3 className="font-bold">
                        Previous Tournament
                      </h3>

                      <p className="text-sm text-muted-foreground">
                        Completed Tournament
                      </p>

                    </div>


                    <div className="flex items-center gap-3">


                      <span className="px-3 py-1 rounded-full text-xs bg-muted">
                        Ended
                      </span>


                      <button className="px-3 py-1 rounded-lg border text-sm">
                        Manage
                      </button>


                    </div>


                  </div>


                </div>


              </div>
            )}





            {section === "members" && (
              <div>

                <h2 className="text-2xl font-bold mb-5">
                  Members
                </h2>


                <UsersPanel />


              </div>
            )}






            {section === "roles" && isOwner && (
              <div>

                <h2 className="text-2xl font-bold mb-5">
                  Roles & Permissions
                </h2>


                <UsersPanel />


              </div>
            )}
                        {section === "settings" && (
              <div>

                <h2 className="text-2xl font-bold mb-5">
                  Website Settings
                </h2>

                <SiteSettingsPanel />

              </div>
            )}



            {section === "history" && (
              <div>

                <h2 className="text-2xl font-bold mb-5">
                  Tournament History
                </h2>

                <HistoryPanel />

              </div>
            )}




            {section === "halloffame" && (
              <div>

                <h2 className="text-2xl font-bold mb-5">
                  Hall of Fame
                </h2>

                <HallOfFamePanel />

              </div>
            )}



          </main>


        </div>


      </div>

    </PageShell>
  );
}
