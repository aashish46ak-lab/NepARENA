import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { HigherLowerGame } from "@/components/HigherLowerGame";
import { buildSeoHead } from "@/lib/seo";

export const Route = createFileRoute("/games/higher-lower")({
  head: () => ({
    ...buildSeoHead({
      title: "Higher or Lower — NepARENA",
      description: "Guess whether the next football legend has a higher or lower overall rating.",
      path: "/games/higher-lower",
    }),
  }),
  component: Page,
});

function Page() {
  return (
    <PageShell force="platform">
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="mb-4 flex items-center justify-between text-sm">
          <Link to="/" className="text-neutral-400 hover:text-neutral-200">
            Home
          </Link>
          <span className="text-neutral-500">Games</span>
        </div>
        <HigherLowerGame />
      </div>
    </PageShell>
  );
}
