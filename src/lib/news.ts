import { supabase } from "@/lib/supabase";
import { NEWS_SEED, type NewsArticle } from "@/content/news";

function mapRow(r: Record<string, unknown>): NewsArticle {
  return {
    id: String(r.id),
    slug: String(r.slug),
    title: String(r.title ?? ""),
    excerpt: String(r.excerpt ?? ""),
    body: String(r.body ?? ""),
    category: String(r.category ?? "General"),
    author: String(r.author ?? "NepARENA"),
    cover_url: (r.cover_url as string | null) ?? null,
    published_at: String(r.published_at ?? r.created_at ?? new Date().toISOString()),
    featured: r.featured === true,
    status: r.status === "draft" ? "draft" : "published",
  };
}

/** Published articles for public listing. Falls back to seed if table missing/empty. */
export async function listPublishedNews(): Promise<NewsArticle[]> {
  try {
    const { data, error } = await supabase
      .from("platform_news")
      .select("*")
      .eq("status", "published")
      .order("published_at", { ascending: false });
    if (error) throw error;
    const rows = (data ?? []).map((r) => mapRow(r as Record<string, unknown>));
    if (rows.length) return rows;
  } catch {
    /* table may not exist yet */
  }
  return NEWS_SEED.filter((n) => n.status === "published");
}

export async function getNewsBySlug(slug: string): Promise<NewsArticle | null> {
  try {
    const { data, error } = await supabase
      .from("platform_news")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    if (!error && data) return mapRow(data as Record<string, unknown>);
  } catch {
    /* ignore */
  }
  return NEWS_SEED.find((n) => n.slug === slug && n.status === "published") ?? null;
}

/** Admin list (all statuses). Empty if table unavailable. */
export async function listAllNewsAdmin(): Promise<NewsArticle[]> {
  try {
    const { data, error } = await supabase
      .from("platform_news")
      .select("*")
      .order("published_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => mapRow(r as Record<string, unknown>));
  } catch {
    return NEWS_SEED;
  }
}

export async function upsertNews(
  article: Partial<NewsArticle> & { title: string; slug: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const payload = {
      slug: article.slug,
      title: article.title,
      excerpt: article.excerpt ?? "",
      body: article.body ?? "",
      category: article.category ?? "General",
      author: article.author ?? "NepARENA",
      cover_url: article.cover_url ?? null,
      published_at: article.published_at ?? new Date().toISOString(),
      featured: article.featured === true,
      status: article.status === "draft" ? "draft" : "published",
    };
    if (article.id && !String(article.id).startsWith("seed-")) {
      const { error } = await supabase
        .from("platform_news")
        .update(payload)
        .eq("id", article.id);
      if (error) return { ok: false, error: error.message };
    } else {
      const { error } = await supabase.from("platform_news").insert(payload);
      if (error) return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? e.message
          : "platform_news table unavailable — run the SQL migration first",
    };
  }
}

export async function deleteNews(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { error } = await supabase.from("platform_news").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Delete failed" };
  }
}
