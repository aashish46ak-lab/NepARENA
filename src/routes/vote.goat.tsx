import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { GoatVoteBooth } from "@/components/GoatVoteBooth";
import { buildSeoHead } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Share2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/vote/goat")({
  head: () => ({
    ...buildSeoHead({
      title: "Vote Your GOAT — Messi vs Ronaldo | NepARENA",
      description:
        "Vote Messi or Ronaldo on NepARENA. Live community GOAT poll with percentages.",
      path: "/vote/goat",
    }),
  }),
  component: GoatVotePage,
});

function GoatVotePage() {
  const share = async () => {
    const url =
      typeof window !== "undefined"
        ? window.location.href
        : "https://neparena.xyz/vote/goat";
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Vote Your GOAT — NepARENA",
          text: "Messi or Ronaldo? Cast your vote on NepARENA",
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Vote link copied");
      }
    } catch {
      /* cancel */
    }
  };

  return (
    <PageShell force="platform">
      <div className="mx-auto max-w-lg px-3 py-6">
        <div className="mb-4 flex items-center justify-between">
          <Button asChild variant="ghost" size="sm" className="-ml-2 text-neutral-400">
            <Link to="/">
              <ArrowLeft className="mr-1 h-4 w-4" /> Home
            </Link>
          </Button>
          <Button size="sm" variant="outline" className="border-white/15" onClick={() => void share()}>
            <Share2 className="mr-1.5 h-3.5 w-3.5" /> Share poll
          </Button>
        </div>
        <GoatVoteBooth />
      </div>
    </PageShell>
  );
}
