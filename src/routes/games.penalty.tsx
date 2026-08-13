import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { PenaltyGame } from "@/components/PenaltyGame";
import { buildSeoHead } from "@/lib/seo";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/games/penalty")({
  head: () => ({
    ...buildSeoHead({
      title: "Penalty Shootout — NepARENA",
      description:
        "Play Penalty Shootout on NepARENA — swipe to shoot, beat the keeper in five kicks.",
      path: "/games/penalty",
    }),
  }),
  component: PenaltyPage,
});

function PenaltyPage() {
  return (
    <PageShell force="platform">
      <div className="mx-auto max-w-lg px-4 py-8">
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4 text-neutral-400">
          <Link to="/games">
            <ArrowLeft className="mr-1 h-4 w-4" /> Games
          </Link>
        </Button>
        <PenaltyGame />
      </div>
    </PageShell>
  );
}
