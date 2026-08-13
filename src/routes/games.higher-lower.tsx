import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { HigherLowerGame } from "@/components/HigherLowerGame";
import { buildSeoHead } from "@/lib/seo";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/games/higher-lower")({
  head: () => ({
    ...buildSeoHead({
      title: "Higher or Lower — NepARENA",
      description: "Guess the next football legend overall rating on NepARENA.",
      path: "/games/higher-lower",
    }),
  }),
  component: HigherLowerPage,
});

function HigherLowerPage() {
  return (
    <PageShell force="platform">
      <div className="mx-auto max-w-lg px-4 py-8">
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4 text-neutral-400">
          <Link to="/games">
            <ArrowLeft className="mr-1 h-4 w-4" /> Games
          </Link>
        </Button>
        <HigherLowerGame />
      </div>
    </PageShell>
  );
}
