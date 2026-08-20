import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { buildSeoHead } from "@/lib/seo";
import { getGuide } from "@/content/guides";
import { ContentPageShell, ContentSection } from "@/components/content/ContentPageShell";

export const Route = createFileRoute("/guides/$slug")({
  loader: ({ params }) => {
    const guide = getGuide(params.slug);
    if (!guide) throw notFound();
    return { guide };
  },
  head: ({ loaderData }) => {
    const g = loaderData?.guide;
    return buildSeoHead({
      title: g?.title ?? "Guide",
      description: g?.excerpt,
      path: g ? `/guides/${g.slug}` : "/guides",
    });
  },
  component: GuideDetailPage,
});

function GuideDetailPage() {
  const { guide } = Route.useLoaderData();
  return (
    <ContentPageShell
      title={guide.title}
      subtitle={guide.category}
      icon={BookOpen}
      backTo="/guides"
      backLabel="Guides"
    >
      <p className="mb-6 text-sm text-neutral-400">{guide.excerpt}</p>
      {guide.sections.map((s) => (
        <ContentSection key={s.heading} title={s.heading}>
          {s.body}
        </ContentSection>
      ))}
      <Link to="/guides" className="text-xs font-semibold text-sky-400 hover:underline">
        ← All guides
      </Link>
    </ContentPageShell>
  );
}
