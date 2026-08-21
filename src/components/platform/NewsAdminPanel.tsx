import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  deleteNews,
  listAllNewsAdmin,
  upsertNews,
} from "@/lib/news";
import type { NewsArticle } from "@/content/news";
import { uploadPublicImage } from "@/lib/upload";

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function NewsAdminPanel() {
  const qc = useQueryClient();
  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ["platform_news_admin"],
    queryFn: listAllNewsAdmin,
  });
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    id: "" as string,
    title: "",
    slug: "",
    excerpt: "",
    body: "",
    category: "Announcement",
    author: "NepARENA",
    cover_url: "",
    featured: false,
    status: "published" as "published" | "draft",
  });

  const reset = () =>
    setForm({
      id: "",
      title: "",
      slug: "",
      excerpt: "",
      body: "",
      category: "Announcement",
      author: "NepARENA",
      cover_url: "",
      featured: false,
      status: "published",
    });

  const edit = (n: NewsArticle) => {
    setForm({
      id: n.id,
      title: n.title,
      slug: n.slug,
      excerpt: n.excerpt,
      body: n.body,
      category: n.category,
      author: n.author,
      cover_url: n.cover_url ?? "",
      featured: n.featured,
      status: n.status,
    });
  };

  const save = async () => {
    if (!form.title.trim()) return toast.error("Title required");
    const slug = form.slug.trim() || slugify(form.title);
    setBusy(true);
    const res = await upsertNews({
      id: form.id || undefined,
      title: form.title.trim(),
      slug,
      excerpt: form.excerpt,
      body: form.body,
      category: form.category,
      author: form.author,
      cover_url: form.cover_url || null,
      featured: form.featured,
      status: form.status,
      published_at: new Date().toISOString(),
    });
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("News saved");
    reset();
    void refetch();
    void qc.invalidateQueries({ queryKey: ["platform_news_public"] });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
        <h3 className="text-sm font-semibold text-white">
          {form.id ? "Edit article" : "New article"}
        </h3>
        <p className="text-xs text-neutral-500">
          Published articles appear on the public News page and home feed.
        </p>
        <Input
          placeholder="Title"
          value={form.title}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              title: e.target.value,
              slug: f.id ? f.slug : slugify(e.target.value),
            }))
          }
        />
        <Input
          placeholder="slug"
          value={form.slug}
          onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
        />
        <Input
          placeholder="Short description"
          value={form.excerpt}
          onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
        />
        <textarea
          className="min-h-[120px] w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
          placeholder="Full article"
          value={form.body}
          onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
        />
        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder="Category"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          />
          <Input
            placeholder="Author"
            value={form.author}
            onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-neutral-400">Cover image (PNG / JPG)</label>
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            className="block w-full text-xs text-neutral-300 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:text-white"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              if (f.size > 8 * 1024 * 1024) {
                toast.error("Max 8MB");
                return;
              }
              setBusy(true);
              try {
                const url = await uploadPublicImage(f, "efn-public", { folder: "news" });
                setForm((prev) => ({ ...prev, cover_url: url }));
                toast.success("Cover uploaded");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Upload failed");
              } finally {
                setBusy(false);
              }
            }}
          />
          {form.cover_url ? (
            <div className="relative mt-1 overflow-hidden rounded-xl border border-white/10">
              <img src={form.cover_url} alt="" className="h-32 w-full object-cover" />
              <button
                type="button"
                className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] text-white"
                onClick={() => setForm((f) => ({ ...f, cover_url: "" }))}
              >
                Remove
              </button>
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-neutral-300">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
            />
            Featured
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={form.status === "published"}
              onChange={() => setForm((f) => ({ ...f, status: "published" }))}
            />
            Published
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={form.status === "draft"}
              onChange={() => setForm((f) => ({ ...f, status: "draft" }))}
            />
            Draft
          </label>
        </div>
        <div className="flex gap-2">
          <Button className="bg-neutral-100 text-black" disabled={busy} onClick={() => void save()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
            Save
          </Button>
          {form.id ? (
            <Button variant="ghost" onClick={reset}>
              Cancel edit
            </Button>
          ) : null}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10">
        {isLoading ? (
          <p className="p-4 text-sm text-neutral-500">Loading…</p>
        ) : (
          data.map((n) => (
            <div
              key={n.id}
              className="flex flex-col gap-2 border-b border-white/5 px-4 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-white">{n.title}</p>
                <p className="text-[11px] text-neutral-500">
                  {n.status} · {n.category} · /news/{n.slug}
                </p>
              </div>
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" onClick={() => edit(n)}>
                  Edit
                </Button>
                {!String(n.id).startsWith("seed-") ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-rose-400"
                    onClick={async () => {
                      if (!confirm("Delete this article?")) return;
                      const res = await deleteNews(n.id);
                      if (!res.ok) toast.error(res.error);
                      else {
                        toast.success("Deleted");
                        void refetch();
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
