import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Newspaper } from "lucide-react";
import { buildSeoHead } from "@/lib/seo";
import { getNewsBySlug } from "@/lib/news";
import { ContentPageShell } from "@/components/content/ContentPageShell";

export const Route = createFileRoute("/news/$slug")({
  loader: async ({ params }) => {
    const article = await getNewsBySlug(params.slug);
    if (!article) throw notFound();
    return { article };
  },
  head: ({ loaderData }) => {
    const a = loaderData?.article;
    return buildSeoHead({
      title: a?.title ?? "News",
      description: a?.excerpt,
      path: a ? `/news/${a.slug}` : "/news",
      type: "article",
      image: a?.cover_url,
    });
  },
  component: NewsArticlePage,
});

function NewsArticlePage() {
  const { article } = Route.useLoaderData();
  return (
    <ContentPageShell
      title={article.title}
      subtitle={`${article.category} · ${new Date(article.published_at).toLocaleDateString()}`}
      icon={Newspaper}
      backTo="/news"
      backLabel="News"
    >
      {article.cover_url ? (
        <img
          src={article.cover_url}
          alt=""
          className="mb-5 max-h-56 w-full rounded-2xl border border-white/10 object-cover"
        />
      ) : null}
      <p className="mb-4 text-sm text-neutral-400">{article.excerpt}</p>
      <div className="whitespace-pre-line text-sm leading-relaxed text-neutral-300">
        {article.body}
      </div>
      <p className="mt-8 text-xs text-neutral-600">By {article.author}</p>
      <Link to="/news" className="mt-4 inline-block text-xs font-semibold text-sky-400 hover:underline">
        ← All news
      </Link>
    </ContentPageShell>
  );
}
