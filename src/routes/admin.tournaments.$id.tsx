import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/PageShell";
import { TournamentManager } from "@/components/tournament-manager/TournamentManager";
import { supabase, type Tournament } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

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
      <PageShell>
        <div className="min-h-[50vh] grid place-items-center">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    );
  }

  if (error || !tournament) {
    return (
      <PageShell>
        <div className="py-20 text-center text-muted-foreground">
          Tournament not found
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="max-w-7xl mx-auto px-4 py-10">
        <TournamentManager tournament={tournament} open onOpenChange={() => {}} />
      </div>
    </PageShell>
  );
}
