import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/PageShell";
import { TournamentManager } from "@/components/tournament-manager/TournamentManager";
import { supabase, type Tournament } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/tournaments/$id")({
  ssr: false,
  component: AdminTournamentPage,
});

function AdminTournamentPage() {
  const { id } = Route.useParams();

  const { data: tournament, isLoading, error } = useQuery({
    queryKey: ["admin_tournament", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data as Tournament | null) ?? null;
    },
  });

  if (isLoading) {
    return (
      <PageShell force="platform" hideChrome>
        <div className="grid min-h-[50vh] place-items-center">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    );
  }

  if (error || !tournament) {
    return (
      <PageShell force="platform" hideChrome>
        <div className="py-20 text-center text-muted-foreground">
          Tournament not found
          <div className="mt-4">
            <Button asChild variant="outline">
              <Link to="/dashboard" search={{ t: "tournaments" }}>
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Back to tournaments
              </Link>
            </Button>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell force="platform" hideChrome>
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/dashboard" search={{ t: "tournaments" }}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to tournaments
          </Link>
        </Button>

        <TournamentManager tournament={tournament} open onOpenChange={() => {}} />
      </div>
    </PageShell>
  );
}
