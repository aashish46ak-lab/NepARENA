import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { buildSeoHead } from "@/lib/seo";
import { GUIDE_CATEGORIES, GUIDES } from "@/content/guides";
import { ContentPageShell } from "@/components/content/ContentPageShell";

export const Route = createFileRoute("/guides")({
  head: () =>
    buildSeoHead({
      title: "Guides",
      description: "Player, tournament, and organizer guides for NepARENA.",
      path: "/guides",
    }),
  component: GuidesPage,
});

function GuidesPage() {
  return (
    <ContentPageShell title="Guides" subtitle="Learn the platform" icon={BookOpen}>
      {GUIDE_CATEGORIES.map((cat) => {
        const items = GUIDES.filter((g) => g.category === cat);
        if (!items.length) return null;
        return (
          <section key={cat} className="mb-8">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-sky-300/90">
              {cat}
            </h2>
            <ul className="space-y-2">
              {items.map((g) => (
                <li key={g.slug}>
                  <Link
                    to="/guides/$slug"
                    params={{ slug: g.slug }}
                    className="block rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 transition hover:border-emerald-500/30 hover:bg-white/[0.05]"
                  >
                    <p className="text-sm font-semibold text-white">{g.title}</p>
                    <p className="mt-0.5 text-xs text-neutral-500">{g.excerpt}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </ContentPageShell>
  );
}
