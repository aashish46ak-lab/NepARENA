import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { DailyQuizGame } from "@/components/DailyQuizGame";
import { buildSeoHead } from "@/lib/seo";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/games/daily-quiz")({
  head: () => ({
    ...buildSeoHead({
      title: "Daily Football Quiz — NepARENA",
      description: "10 timed football questions every day on NepARENA.",
      path: "/games/daily-quiz",
    }),
  }),
  component: DailyQuizPage,
});

function DailyQuizPage() {
  return (
    <PageShell force="platform">
      <div className="mx-auto max-w-lg px-4 py-8">
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4 text-neutral-400">
          <Link to="/games">
            <ArrowLeft className="mr-1 h-4 w-4" /> Games
          </Link>
        </Button>
        <DailyQuizGame />
      </div>
    </PageShell>
  );
}
