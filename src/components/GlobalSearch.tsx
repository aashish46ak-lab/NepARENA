import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Search, X, Building2, User } from "lucide-react";
import { cn } from "@/lib/utils";

type Hit =
  | {
      kind: "user";
      id: string;
      title: string;
      subtitle: string | null;
      avatar: string | null;
    }
  | {
      kind: "organizer";
      id: string;
      slug: string;
      title: string;
      subtitle: string | null;
      avatar: string | null;
    };

export function GlobalSearchButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="grid h-9 w-9 place-items-center rounded-full text-neutral-300 transition hover:bg-white/10 hover:text-white"
        aria-label="Search"
      >
        <Search className="h-4 w-4" />
      </button>
      {open && <SearchOverlay onClose={() => setOpen(false)} />}
    </>
  );
}

function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 1) {
      setHits([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = window.setTimeout(async () => {
      const like = `%${term}%`;
      const [users, orgs] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url")
          .or(`username.ilike.${like},full_name.ilike.${like}`)
          .limit(8),
        supabase
          .from("organizers")
          .select("id, slug, name, logo_url, tagline")
          .eq("status", "active")
          .ilike("name", like)
          .limit(6),
      ]);
      if (cancelled) return;
      const uHits: Hit[] = ((users.data ?? []) as {
        id: string;
        username: string | null;
        full_name: string | null;
        avatar_url: string | null;
      }[]).map((u) => ({
        kind: "user",
        id: u.id,
        title: u.full_name?.trim() || u.username?.trim() || "Player",
        subtitle: u.username ? `@${u.username}` : null,
        avatar: u.avatar_url,
      }));
      const oHits: Hit[] = ((orgs.data ?? []) as {
        id: string;
        slug: string;
        name: string;
        logo_url: string | null;
        tagline: string | null;
      }[]).map((o) => ({
        kind: "organizer",
        id: o.id,
        slug: o.slug,
        title: o.name,
        subtitle: o.tagline,
        avatar: o.logo_url,
      }));
      setHits([...oHits, ...uHits]);
      setLoading(false);
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/70 px-3 pt-16 backdrop-blur-sm sm:pt-24">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/15 bg-[#0c0c0c] shadow-2xl">
        <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
          <Search className="h-4 w-4 text-neutral-500" />
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search players & organizers…"
            className="border-0 bg-transparent focus-visible:ring-0"
          />
          <button type="button" onClick={onClose} className="p-1 text-neutral-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {loading && <p className="p-3 text-xs text-neutral-500">Searching…</p>}
          {!loading && q.trim() && hits.length === 0 && (
            <p className="p-3 text-xs text-neutral-500">No results</p>
          )}
          {hits.map((h) =>
            h.kind === "user" ? (
              <Link
                key={`u-${h.id}`}
                to="/members/$id"
                params={{ id: h.id }}
                onClick={onClose}
                className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/[0.06]"
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={h.avatar ?? undefined} />
                  <AvatarFallback>{h.title.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{h.title}</p>
                  <p className="truncate text-[11px] text-neutral-500">{h.subtitle}</p>
                </div>
                <User className="h-3.5 w-3.5 text-neutral-600" />
              </Link>
            ) : (
              <Link
                key={`o-${h.id}`}
                to="/o/$slug"
                params={{ slug: h.slug }}
                onClick={onClose}
                className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/[0.06]"
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={h.avatar ?? undefined} />
                  <AvatarFallback>{h.title.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{h.title}</p>
                  <p className={cn("truncate text-[11px] text-neutral-500")}>
                    {h.subtitle || "Organizer"}
                  </p>
                </div>
                <Building2 className="h-3.5 w-3.5 text-neutral-600" />
              </Link>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
