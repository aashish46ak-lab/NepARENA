import { createFileRoute, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { useTournaments } from "@/hooks/useContent";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Award, Calendar } from "lucide-react";
import { SmartImage } from "@/components/SmartImage";

export const Route = createFileRoute("/tournaments")({
  head: () => ({
    meta: [
      { title: "Tournaments — eFootball Nepal" },
      {
        name: "description",
        content:
          "Browse upcoming, ongoing, and completed eFootball tournaments in Nepal.",
      },
    ],
  }),
  component: TournamentsLayout,
});

function TournamentsLayout() {
  const matchRoute = useMatchRoute();
  const isDetail = matchRoute({ to: "/tournaments/$id", fuzzy: false });

  // Detail page: let child route render
  if (isDetail) {
    return <Outlet />;
  }

  // List page
  const { data: all = [], isLoading } = useTournaments();
  const list = all.filter((t) => t.status !== "completed");

  return (
    <PageShell>
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-bold">Tournaments</h1>
        <p className="text-muted-foreground mt-2">
          Every tournament run by eFootball Nepal.
        </p>

        {isLoading && (
          <div className="mt-8 text-muted-foreground">Loading…</div>
        )}

        {!isLoading && list.length === 0 && (
          <div className="mt-8 glass rounded-xl p-8 text-center text-muted-foreground">
            No active tournaments right now — see the{" "}
            <Link to="/history" className="text-brand-glow hover:underline">
              tournament history
            </Link>
            .
          </div>
        )}

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {list.map((t) => (
            <Link
              key={t.id}
              to="/tournaments/$id"
              params={{ id: t.id }}
              className="glass rounded-2xl overflow-hidden cursor-pointer hover:scale-[1.02] transition block"
            >
              <SmartImage
                src={t.banner_url}
                alt={t.name}
                ratio="aspect-video"
                zoom={false}   // important: don't steal the click
                fallback={
                  <div className="absolute inset-0 bg-gradient-brand opacity-15 grid place-items-center">
                    <Trophy className="h-16 w-16 text-brand" />
                  </div>
                }
              />
              <div className="p-5">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <Badge className="bg-brand/25 text-brand-glow capitalize">
                    {t.status.replace("_", " ")}
                  </Badge>
                  {t.registration_open && (
                    <Badge className="bg-emerald-500/20 text-emerald-300">
                      Registration open
                    </Badge>
                  )}
                </div>
                <h3 className="text-xl font-bold">{t.name}</h3>
                {t.description && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t.description}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {t.prize_pool && (
                    <span className="inline-flex items-center gap-1">
                      <Award className="h-4 w-4" /> {t.prize_pool}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-4 w-4" /> {t.participants_count} players
                  </span>
                  {t.starts_at && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-4 w-4" />{" "}
                      {new Date(t.starts_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </PageShell>
  );
                  }
