import { createFileRoute, useRouter } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { BlindRankGame } from "@/components/BlindRankGame";
import { buildSeoHead } from "@/lib/seo";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/games/blind-ranking")({
  head: () => ({
    ...buildSeoHead({
      title: "Blind Ranking — NepARENA",
      description: "Blind Ranking on NepARENA.",
      path: "/games/blind-ranking",
    }),
  }),
  component: BlindRankingPage,
});

function BlindRankingPage() {
  const router = useRouter();
  return (
    <PageShell force="platform" hideChrome>
      <div className="mx-auto max-w-lg px-4 pb-10 pt-3">
        <button
          type="button"
          onClick={() => router.history.back()}
          className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-sm text-neutral-200 hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <BlindRankGame />
      </div>
    </PageShell>
  );
}
