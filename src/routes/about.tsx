import { createFileRoute, Link } from "@tanstack/react-router";
import { Info } from "lucide-react";
import { buildSeoHead } from "@/lib/seo";
import { ABOUT } from "@/content/about";
import { ContentPageShell, ContentSection } from "@/components/content/ContentPageShell";

export const Route = createFileRoute("/about")({
  head: () =>
    buildSeoHead({
      title: "About NepARENA",
      description: ABOUT.heroSubtitle,
      path: "/about",
    }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <ContentPageShell title={ABOUT.heroTitle} subtitle={ABOUT.heroSubtitle} icon={Info}>
      <p className="mb-8 text-sm leading-relaxed text-neutral-400">{ABOUT.heroSubtitle}</p>
      {ABOUT.sections.map((s) => (
        <ContentSection key={s.id} title={s.title}>
          {s.body}
        </ContentSection>
      ))}
      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          to="/rules"
          className="rounded-full border border-white/15 bg-white/[0.05] px-4 py-2 text-xs font-semibold text-white hover:bg-white/10"
        >
          Rules & Regulations
        </Link>
        <Link
          to="/guides"
          className="rounded-full border border-white/15 bg-white/[0.05] px-4 py-2 text-xs font-semibold text-white hover:bg-white/10"
        >
          Guides
        </Link>
      </div>
    </ContentPageShell>
  );
}
