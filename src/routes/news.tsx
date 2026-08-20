import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Newspaper } from "lucide-react";
import { buildSeoHead } from "@/lib/seo";
import { listPublishedNews } from "@/lib/news";
import { ContentPageShell } from "@/components/content/ContentPageShell";

export const Route = createFileRoute("/news")({
  head: () =>
    buildSeoHead({
      title: "News",
      description: "Official NepARENA updates and announcements.",
      path: "/news",
    }),
  component: NewsListPage,
});

function NewsListPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["platform_news_public"],
    queryFn: listPublishedNews,
  });

  return (
    <ContentPageShell title="News" subtitle="Updates from NepARENA" icon={Newspaper}>
      {isLoading ? (
        <p className="text-sm text-neutral-500">Loading…</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-neutral-500">No published news yet.</p>
      ) : (
        <ul className="space-y-3">
          {data.map((n) => (
            <li key={n.id}>
              <Link
                to="/news/$slug"
                params={{ slug: n.slug }}
                className="block rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-sky-500/30 hover:bg-white/[0.05]"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-white">{n.title}</p>
                  {n.featured ? (
                    <span className="shrink-0 rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-bold text-sky-200">
                      Featured
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-neutral-500 line-clamp-2">{n.excerpt}</p>
                <p className="mt-2 text-[10px] uppercase tracking-wider text-neutral-600">
                  {n.category} · {new Date(n.published_at).toLocaleDateString()} · Read more
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </ContentPageShell>
  );
}
