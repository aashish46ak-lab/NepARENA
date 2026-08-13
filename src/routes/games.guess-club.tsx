import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { GuessClubGame } from "@/components/GuessClubGame";
import { buildSeoHead } from "@/lib/seo";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/games/guess-club")({
  head: () => ({
    ...buildSeoHead({
      title: "Guess the Club — NepARENA",
      description: "Guess football clubs from hints on NepARENA.",
      path: "/games/guess-club",
    }),
  }),
  component: GuessClubPage,
});

function GuessClubPage() {
  return (
    <PageShell force="platform">
      <div className="mx-auto max-w-lg px-4 py-8">
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4 text-neutral-400">
          <Link to="/games">
            <ArrowLeft className="mr-1 h-4 w-4" /> Games
          </Link>
        </Button>
        <GuessClubGame />
      </div>
    </PageShell>
  );
}
