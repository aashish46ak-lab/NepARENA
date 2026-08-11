import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { PLATFORM_NAME } from "@/lib/organizers";
import { Mail, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/ownership")({
  head: () => ({
    meta: [{ title: `Creators — ${PLATFORM_NAME}` }],
  }),
  component: OwnershipPage,
});

function OwnershipPage() {
  return (
    <PageShell force="platform">
      <div className="mx-auto max-w-3xl px-4 py-14">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Creators</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Founders of the {PLATFORM_NAME} platform
        </p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-transparent p-6 shadow-xl">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-neutral-100 to-neutral-400 text-xl font-bold text-black">
              AK
            </div>
            <p className="mt-4 text-[11px] uppercase tracking-[0.2em] text-neutral-500">
              Founder & CEO
            </p>
            <h2 className="text-xl font-semibold">Ashish Khadka</h2>
            <a
              href="mailto:aashish46ak@gmail.com"
              className="mt-2 inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-200"
            >
              <Mail className="h-3.5 w-3.5" />
              aashish46ak@gmail.com
            </a>
            <p className="mt-3 text-sm leading-relaxed text-neutral-500">
              Platform creator, system architecture, product vision and roadmap.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-transparent p-6 shadow-xl">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-neutral-400 to-neutral-700 text-xl font-bold text-white">
              AB
            </div>
            <p className="mt-4 text-[11px] uppercase tracking-[0.2em] text-neutral-500">
              Co-Founder
            </p>
            <h2 className="text-xl font-semibold">Ashish Baral</h2>
            <a
              href="mailto:baralk851@gmail.com"
              className="mt-2 inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-200"
            >
              <Mail className="h-3.5 w-3.5" />
              baralk851@gmail.com
            </a>
            <p className="mt-3 text-sm leading-relaxed text-neutral-500">
              Platform improvements, feedback, ideas, testing and strategy.
            </p>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
