import { createFileRoute } from "@tanstack/react-router";
import { Scale } from "lucide-react";
import { buildSeoHead } from "@/lib/seo";
import { RULES_INTRO, RULE_SECTIONS } from "@/content/rules";
import { ContentPageShell } from "@/components/content/ContentPageShell";

export const Route = createFileRoute("/rules")({
  head: () =>
    buildSeoHead({
      title: "Rules & Regulations",
      description:
        "NepARENA community and tournament rules for fair play, results, and safety.",
      path: "/rules",
    }),
  component: RulesPage,
});

function RulesPage() {
  return (
    <ContentPageShell
      title="Rules & Regulations"
      subtitle="Fair play for everyone"
      icon={Scale}
    >
      <p className="mb-6 text-sm leading-relaxed text-neutral-400">{RULES_INTRO}</p>
      <nav className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
          On this page
        </p>
        <ol className="columns-1 gap-3 text-xs text-sky-300/90 sm:columns-2">
          {RULE_SECTIONS.map((s) => (
            <li key={s.id} className="mb-1.5 break-inside-avoid">
              <a href={`#${s.id}`} className="hover:underline">
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <div className="space-y-8">
        {RULE_SECTIONS.map((s) => (
          <section key={s.id} id={s.id} className="scroll-mt-24">
            <h2 className="mb-2 text-sm font-bold text-white">{s.title}</h2>
            {s.highlight ? (
              <p className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-100">
                {s.highlight}
              </p>
            ) : null}
            <ul className="space-y-2">
              {s.items.map((item, i) => (
                <li
                  key={i}
                  className="flex gap-2 text-sm leading-relaxed text-neutral-300"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400/80" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </ContentPageShell>
  );
}
