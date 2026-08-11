import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { BlindRankGame } from "@/components/BlindRankGame";
import { buildSeoHead } from "@/lib/seo";
import { ArrowLeft, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/games/blind-ranking")({
  head: () => ({
    ...buildSeoHead({
      title: "Blind Ranking — NepARENA",
      description:
        "Play the viral Blind Ranking football legend test on NepARENA. Rank players one by one and share your results.",
      path: "/games/blind-ranking",
    }),
  }),
  component: BlindRankingPage,
});

function BlindRankingPage() {
  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "https://neparena.xyz/games/blind-ranking";
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Blind Ranking — NepARENA",
          text: "Play Blind Ranking on NepARENA!",
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied — share anywhere");
      }
    } catch {
      /* cancel */
    }
  };

  return (
    <PageShell force="platform">
      <div className="mx-auto max-w-lg px-3 py-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <Button asChild variant="ghost" size="sm" className="-ml-2 text-neutral-400">
            <Link to="/">
              <ArrowLeft className="mr-1 h-4 w-4" /> Home
            </Link>
          </Button>
          <Button size="sm" variant="outline" className="border-white/15" onClick={() => void share()}>
            <Share2 className="mr-1.5 h-3.5 w-3.5" /> Share game
          </Button>
        </div>
        <BlindRankGame />
      </div>
    </PageShell>
  );
}
