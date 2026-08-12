import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { PenaltyGame } from "@/components/PenaltyGame";
import { buildSeoHead } from "@/lib/seo";

export const Route = createFileRoute("/games/penalty")({
  head: () => ({
    ...buildSeoHead({
      title: "Penalty Shootout — NepARENA",
      description: "Play Penalty Shootout on NepARENA — pick left, center or right and beat the keeper.",
      path: "/games/penalty",
    }),
  }),
  component: PenaltyPage,
});

function PenaltyPage() {
  return (
    <PageShell force="platform">
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="mb-4 flex items-center justify-between text-sm">
          <Link to="/" className="text-neutral-400 hover:text-neutral-200">
            Home
          </Link>
          <span className="text-neutral-500">Games</span>
        </div>
        <PenaltyGame />
      </div>
    </PageShell>
  );
}
