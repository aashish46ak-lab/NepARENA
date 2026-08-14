import { createFileRoute, useRouter } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { PenaltyGame } from "@/components/PenaltyGame";
import { buildSeoHead } from "@/lib/seo";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/games/penalty")({
  head: () => ({
    ...buildSeoHead({
      title: "Penalty Shootout — NepARENA",
      description: "Play Penalty Shootout on NepARENA.",
      path: "/games/penalty",
    }),
  }),
  component: PenaltyPage,
});

function PenaltyPage() {
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
        <PenaltyGame />
      </div>
    </PageShell>
  );
}
