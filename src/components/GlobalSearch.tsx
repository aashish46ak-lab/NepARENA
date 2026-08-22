import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Search, X, Building2, User, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { InlineStreak } from "@/components/StreakBadge";

type Hit =
  | {
      kind: "user";
      id: string;
      title: string;
      subtitle: string | null;
      avatar: string | null;
      streak?: number;
    }
  | {
      kind: "organizer";
      id: string;
      slug: string;
      title: string;
      subtitle: string | null;
      avatar: string | null;
    }
  | {
      kind: "tournament";
      id: string;
      title: string;
      subtitle: string | null;
    };

export function GlobalSearchBar({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  return (
    <div className={cn("relative min-w-0 flex-1", className)}>
      <div
        className="flex h-10 items-center gap-2 rounded-full border border-border bg-muted px-3 transition focus-within:border-ring focus-within:bg-card"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search players, organizers or tournaments..."
          className="h-9 border-0 bg-transparent px-0 text-sm text-foreground shadow-none placeholder:text-muted-foreground focus-visible:ring-0"
        />
        {q && (
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              setQ("");
            }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {open && (
        <SearchResults
          q={q}
          onClose={() => {
            setOpen(false);
            setQ("");
          }}
          embedded
        />
      )}
    </div>
  );
}

export function GlobalSearchButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
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
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 px-3 pt-16 backdrop-blur-sm sm:pt-24">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search players, organizers or tournaments..."
            className="border-0 bg-transparent text-foreground placeholder:text-muted-foreground focus-visible:ring-0"
          />
          <button type="button" onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <SearchResults q={q} onClose={onClose} />
      </div>
    </div>
  );
}

function SearchResults({
  q,
  onClose,
  embedded,
}: {
  q: string;
  onClose: () => void;
  embedded?: boolean;
}) {
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!embedded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest?.("[data-search-panel]")) onClose();
    };
    window.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => window.addEventListener("click", onClick), 0);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("click", onClick);
      clearTimeout(t);
    };
  }, [embedded, onClose]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 1) {
      setHits([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      const like = `%${term}%`;
      const [users, orgs, tours] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url, login_streak")
          .or(`username.ilike.${like},full_name.ilike.${like}`)
          .limit(8),
        supabase
          .from("organizers")
          .select("id, slug, name, logo_url, tagline")
          .eq("status", "active")
          .ilike("name", like)
          .limit(5),
        supabase
          .from("tournaments")
          .select("id, name, status")
          .eq("is_published", true)
          .ilike("name", like)
          .limit(5),
      ]);
      if (cancelled) return;
      const uHits: Hit[] = (
        (users.data ?? []) as {
          id: string;
          username: string | null;
          full_name: string | null;
          avatar_url: string | null;
          login_streak?: number | null;
        }[]
      ).map((u) => ({
        kind: "user",
        id: u.id,
        title: u.full_name?.trim() || u.username?.trim() || "Player",
        subtitle: u.username ? `@${u.username}` : null,
        avatar: u.avatar_url,
        streak: Number(u.login_streak ?? 0),
      }));
      const oHits: Hit[] = (
        (orgs.data ?? []) as {
          id: string;
          slug: string;
          name: string;
          logo_url: string | null;
          tagline: string | null;
        }[]
      ).map((o) => ({
        kind: "organizer",
        id: o.id,
        slug: o.slug,
        title: o.name,
        subtitle: o.tagline,
        avatar: o.logo_url,
      }));
      const tHits: Hit[] = (
        (tours.data ?? []) as { id: string; name: string; status: string | null }[]
      ).map((t) => ({
        kind: "tournament",
        id: t.id,
        title: t.name,
        subtitle: (t.status ?? "").replaceAll("_", " ") || "Tournament",
      }));
      setHits([...tHits, ...oHits, ...uHits]);
      setLoading(false);
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q]);

  if (!q.trim() && embedded) return null;

  return (
    <div
      data-search-panel
      className={cn(
        embedded
          ? "absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-80 overflow-y-auto rounded-2xl border border-border bg-popover p-2 text-popover-foreground shadow-2xl"
          : "max-h-80 overflow-y-auto p-2",
      )}
    >
      {loading && <p className="p-3 text-xs text-muted-foreground">Searching…</p>}
      {!loading && q.trim() && hits.length === 0 && (
        <p className="p-3 text-xs text-muted-foreground">No results</p>
      )}
      {hits.map((h) =>
        h.kind === "user" ? (
          <Link
            key={`u-${h.id}`}
            to="/members/$id"
            params={{ id: h.id }}
            onClick={onClose}
            className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-muted"
          >
            <Avatar className="h-9 w-9">
              <AvatarImage src={h.avatar ?? undefined} />
              <AvatarFallback>{h.title.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
                {h.title}
                <InlineStreak streak={h.streak} />
              </p>
              <p className="truncate text-[11px] text-muted-foreground">{h.subtitle}</p>
            </div>
            <User className="h-3.5 w-3.5 text-muted-foreground" />
          </Link>
        ) : h.kind === "organizer" ? (
          <Link
            key={`o-${h.id}`}
            to="/o/$slug"
            params={{ slug: h.slug }}
            onClick={onClose}
            className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-muted"
          >
            <Avatar className="h-9 w-9">
              <AvatarImage src={h.avatar ?? undefined} />
              <AvatarFallback>{h.title.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{h.title}</p>
              <p className="truncate text-[11px] text-muted-foreground">{h.subtitle || "Organizer"}</p>
            </div>
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
          </Link>
        ) : (
          <Link
            key={`t-${h.id}`}
            to="/tournaments/$id"
            params={{ id: h.id }}
            onClick={onClose}
            className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-muted"
          >
            <div className="grid h-9 w-9 place-items-center rounded-full bg-amber-500/15 text-amber-700">
              <Trophy className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{h.title}</p>
              <p className="truncate text-[11px] capitalize text-muted-foreground">{h.subtitle}</p>
            </div>
            <Trophy className="h-3.5 w-3.5 text-muted-foreground" />
          </Link>
        ),
      )}
    </div>
  );
}
