import { createFileRoute, useRouter } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { GoatVoteBooth } from "@/components/GoatVoteBooth";
import { buildSeoHead } from "@/lib/seo";
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
  const router = useRouter();
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
    <PageShell force="platform" hideChrome>
      <div className="mx-auto max-w-lg px-3 pb-10 pt-3">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.history.back()}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-sm text-neutral-200 hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <button
            type="button"
            onClick={() => void share()}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-sm text-neutral-200 hover:bg-white/10"
          >
            <Share2 className="h-3.5 w-3.5" /> Share
          </button>
        </div>
        <GoatVoteBooth />
      </div>
    </PageShell>
  );
}
