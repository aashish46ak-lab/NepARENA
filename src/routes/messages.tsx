import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { useAuth } from "@/hooks/useAuth";
import { buildSeoHead } from "@/lib/seo";
import {
  formatMsgTime,
  getOrCreateDm,
  listDmMessages,
  listDmThreads,
  markDmRead,
  sendDmMessage,
  type DmMessage,
  type DmThread,
} from "@/lib/dm";
import { listActiveOrganizers, type Organizer } from "@/lib/organizers";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  ImagePlus,
  Loader2,
  MessageCircle,
  Plus,
  Search,
  Send,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { uploadPublicImage } from "@/lib/upload";

export const Route = createFileRoute("/messages")({
  validateSearch: (s: Record<string, unknown>): { with?: string; c?: string } => ({
    with: typeof s.with === "string" ? s.with : undefined,
    c: typeof s.c === "string" ? s.c : undefined,
  }),
  head: () => ({
    ...buildSeoHead({
      title: "Messages — NepARENA",
      description: "Direct messages on NepARENA",
      path: "/messages",
    }),
  }),
  component: MessagesPage,
});

type ComposeHit = {
  kind: "user" | "organizer";
  id: string;
  name: string;
  subtitle: string;
  avatar: string | null;
  peerId: string;
  verified?: boolean;
};

function MessagesPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate({ from: "/messages" });
  const search = Route.useSearch();
  const [threads, setThreads] = useState<DmThread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileChat, setMobileChat] = useState(false);
  const [kbInset, setKbInset] = useState(0);
  const [tab, setTab] = useState<"inbox" | "requests">("inbox");
  const [query, setQuery] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeQ, setComposeQ] = useState("");
  const [composeBusy, setComposeBusy] = useState(false);
  const [composeResults, setComposeResults] = useState<ComposeHit[]>([]);
  const [followedOrgs, setFollowedOrgs] = useState<Organizer[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    const y = window.scrollY || 0;
    const prev = { o: body.style.overflow, p: body.style.position, t: body.style.top, w: body.style.width, ho: html.style.overflow };
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${y}px`;
    body.style.width = "100%";
    html.style.overflow = "hidden";
    return () => {
      body.style.overflow = prev.o;
      body.style.position = prev.p;
      body.style.top = prev.t;
      body.style.width = prev.w;
      html.style.overflow = prev.ho;
      body.removeAttribute("data-mobile-chat");
      window.scrollTo(0, y);
    };
  }, []);

  useEffect(() => {
    if (mobileChat) document.body.setAttribute("data-mobile-chat", "1");
    else document.body.removeAttribute("data-mobile-chat");
  }, [mobileChat]);

  useEffect(() => {
    if (!mobileChat) { setKbInset(0); return; }
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKbInset(inset > 40 ? inset : 0);
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ block: "end" }));
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => { vv.removeEventListener("resize", update); vv.removeEventListener("scroll", update); };
  }, [mobileChat]);

  const inbox = useMemo(() => threads.filter((t) => t.status === "active"), [threads]);
  const requests = useMemo(() => threads.filter((t) => t.status === "request"), [threads]);
  const filteredList = useMemo(() => {
    const base = tab === "requests" ? requests : inbox;
    if (!query.trim()) return base;
    const q = query.toLowerCase();
    return base.filter((t) => t.peer_name.toLowerCase().includes(q));
  }, [tab, requests, inbox, query]);
  const activeThread = useMemo(() => threads.find((t) => t.conversation_id === activeId) ?? null, [threads, activeId]);

  const reloadThreads = async () => {
    if (!user) return;
    setThreads(await listDmThreads(user.id));
  };

  useEffect(() => {
    if (!user) return;
    void (async () => {
      setLoading(true);
      await reloadThreads();
      setLoading(false);
    })();
  }, [user?.id]);

  useEffect(() => {
    if (search.c) { setActiveId(search.c); setMobileChat(true); }
  }, [search.c]);

  useEffect(() => {
    if (!user || !search.with || search.c) return;
    let cancelled = false;
    void (async () => {
      const cid = await getOrCreateDm(search.with!);
      if (cancelled || !cid) return;
      setActiveId(cid);
      setMobileChat(true);
      void navigate({ search: { c: cid, with: search.with } });
      await reloadThreads();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, search.with]);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      try {
        const orgs = await listActiveOrganizers();
        const { data: follows } = await supabase.from("organizer_followers").select("organizer_id").eq("user_id", user.id);
        const ids = new Set((follows ?? []).map((r: { organizer_id: string }) => r.organizer_id));
        const mine = orgs.filter((o) => ids.has(o.id) && o.owner_id && o.owner_id !== user.id);
        setFollowedOrgs(mine.length ? mine : orgs.filter((o) => o.owner_id && o.owner_id !== user.id).slice(0, 12));
      } catch { /* ignore */ }
    })();
  }, [user?.id]);

  useEffect(() => {
    if (!composeOpen || !user) return;
    const q = composeQ.trim();
    const t = window.setTimeout(() => {
      void (async () => {
        const out: ComposeHit[] = [];
        try {
          const orgs = await listActiveOrganizers();
          const ql = q.toLowerCase();
          const matched = (q
            ? orgs.filter((o) => o.name.toLowerCase().includes(ql) || o.slug.toLowerCase().includes(ql))
            : followedOrgs.length ? followedOrgs : orgs.slice(0, 8)
          ).filter((o) => o.owner_id && o.owner_id !== user.id);
          for (const o of matched.slice(0, 10)) {
            out.push({
              kind: "organizer",
              id: o.id,
              name: o.name,
              subtitle: o.is_verified ? "Verified organizer" : "Organizer",
              avatar: o.logo_url,
              peerId: o.owner_id!,
              verified: o.is_verified,
            });
          }
        } catch { /* ignore */ }
        if (q.length >= 1) {
          const { data: people } = await supabase
            .from("profiles")
            .select("id, username, full_name, avatar_url, is_verified")
            .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
            .neq("id", user.id)
            .limit(12);
          for (const p of people ?? []) {
            const name = (p.full_name as string)?.trim() || (p.username as string)?.trim() || "Player";
            if (out.some((r) => r.peerId === p.id && r.kind === "organizer")) continue;
            out.push({
              kind: "user",
              id: p.id as string,
              name,
              subtitle: (p.username as string) ? `@${p.username}` : "Player",
              avatar: (p.avatar_url as string) ?? null,
              peerId: p.id as string,
              verified: !!(p as { is_verified?: boolean }).is_verified,
            });
          }
        }
        setComposeResults(out);
      })();
    }, 220);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [composeOpen, composeQ, user?.id, followedOrgs]);

  useEffect(() => {
    if (!user || !activeId) return;
    void (async () => {
      setMessages(await listDmMessages(activeId));
      await markDmRead(activeId, user.id);
      await reloadThreads();
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    })();
  }, [user?.id, activeId]);

  const startChatWithPeer = async (peerId: string, label?: string) => {
    if (!user || composeBusy || !peerId || peerId === user.id) return;
    setComposeBusy(true);
    try {
      const cid = await getOrCreateDm(peerId);
      if (!cid) { toast.error("Could not start chat"); return; }
      setComposeOpen(false);
      setComposeQ("");
      setActiveId(cid);
      setMobileChat(true);
      void navigate({ search: { c: cid, with: peerId } });
      await reloadThreads();
      if (label) toast.message(`Chat with ${label}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start chat");
    } finally {
      setComposeBusy(false);
    }
  };

  const openThread = (id: string) => {
    setActiveId(id);
    setMobileChat(true);
    void navigate({ search: { c: id } });
  };

  const closeChat = () => {
    setMobileChat(false);
    setActiveId(null);
    void navigate({ search: {} });
  };

  const send = async () => {
    if (!user || !activeId || !text.trim() || busy) return;
    setBusy(true);
    const body = text.trim();
    setText("");
    const res = await sendDmMessage({ conversationId: activeId, senderId: user.id, body });
    setBusy(false);
    if (res.error) toast.error(res.error);
    else {
      setMessages(await listDmMessages(activeId));
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 40);
      await reloadThreads();
    }
  };

  const sendPhoto = async (file: File) => {
    if (!user || !activeId || busy) return;
    setBusy(true);
    try {
      const url = await uploadPublicImage(file, "messages");
      const res = await sendDmMessage({ conversationId: activeId, senderId: user.id, body: "", imageUrl: url });
      if (res.error) toast.error(res.error);
      else {
        setMessages(await listDmMessages(activeId));
        await reloadThreads();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Photo upload failed");
    }
    setBusy(false);
  };

  if (!user) {
    return (
      <PageShell force="platform" hideChrome>
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <p className="text-neutral-400">Sign in to view messages.</p>
          <Button asChild className="mt-4"><Link to="/auth">Sign in</Link></Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell force="platform" hideChrome>
      <div
        className={cn(
          "fixed inset-0 z-10 flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-[#0a0a0a] pt-[env(safe-area-inset-top,0px)]",
          mobileChat ? "pb-0" : "pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]",
        )}
      >
        {!mobileChat && (
          <header className="z-40 shrink-0 border-b border-white/10 bg-[#0a0a0a]/95 backdrop-blur-md">
            <div className="mx-auto flex h-12 max-w-5xl items-center justify-between gap-2 px-3">
              <h1 className="text-[15px] font-semibold text-white">Messages</h1>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 rounded-full border-white/15 bg-white/[0.04] px-3 text-xs font-semibold text-white hover:bg-white/[0.08]"
                onClick={() => { setComposeOpen(true); setComposeQ(""); }}
              >
                <Plus className="h-3.5 w-3.5" /> New
              </Button>
            </div>
          </header>
        )}

        <div className={cn("mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col overflow-hidden", mobileChat ? "px-0 pt-0" : "px-2 pt-2 sm:px-4")}>
          {!mobileChat && (
            <>
              <div className="mb-2 shrink-0">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                  <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search conversations…" className="h-10 rounded-xl border-white/10 bg-white/[0.05] pl-9" />
                </div>
              </div>
              <div className="mb-2 flex shrink-0 gap-2">
                <button type="button" onClick={() => setTab("inbox")} className={cn("rounded-full px-3 py-1 text-xs font-semibold", tab === "inbox" ? "bg-sky-500 text-white" : "bg-white/5 text-neutral-400")}>Inbox</button>
                <button type="button" onClick={() => setTab("requests")} className={cn("rounded-full px-3 py-1 text-xs font-semibold", tab === "requests" ? "bg-sky-500 text-white" : "bg-white/5 text-neutral-400")}>Requests{requests.length > 0 ? ` (${requests.length})` : ""}</button>
              </div>
            </>
          )}

          <div className={cn("flex min-h-0 flex-1 overflow-hidden", mobileChat ? "rounded-none border-0 bg-[#0a0a0a]" : "rounded-2xl border border-white/10 bg-black/40 shadow-inner")}>
            <aside className={cn("flex h-full w-full min-h-0 flex-col border-r border-white/10 md:w-[320px] md:shrink-0", mobileChat && "hidden md:flex")}>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
                {loading && <p className="p-6 text-center text-sm text-neutral-500">Loading…</p>}
                {!loading && filteredList.length === 0 && (
                  <p className="p-6 text-center text-sm text-neutral-500">
                    {query ? "No chats match." : tab === "requests" ? "No requests." : "No conversations yet. Tap New to message a player or organizer."}
                  </p>
                )}
                {filteredList.map((t) => (
                  <button key={t.conversation_id} type="button" onClick={() => openThread(t.conversation_id)} className={cn("flex w-full items-center gap-3 border-b border-white/5 px-3 py-3 text-left hover:bg-white/[0.04]", activeId === t.conversation_id && "bg-white/[0.06]")}>
                    <Avatar className="h-11 w-11">
                      <AvatarImage src={t.peer_avatar ?? undefined} />
                      <AvatarFallback>{t.peer_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium text-neutral-100">{t.peer_name}</p>
                        {t.unread > 0 && <span className="shrink-0 rounded-full bg-sky-500 px-1.5 text-[10px] font-semibold text-white">{t.unread}</span>}
                      </div>
                      <p className="truncate text-xs text-neutral-500">{t.last_body?.startsWith("__voice__:") ? "🎤 Voice message" : t.last_body || "Start chatting"}</p>
                    </div>
                  </button>
                ))}
              </div>
            </aside>

            <section
              className={cn("flex min-h-0 flex-1 flex-col bg-[#0a0a0a]", !mobileChat && "hidden md:flex", mobileChat && "fixed inset-0 z-[100] flex w-full animate-in slide-in-from-right duration-200 md:static md:z-auto md:h-auto md:max-h-none md:animate-none")}
              style={mobileChat ? { height: kbInset > 0 ? `calc(100dvh - ${kbInset}px)` : "100dvh", maxHeight: kbInset > 0 ? `calc(100dvh - ${kbInset}px)` : "100dvh", transition: "height 0.12s ease-out" } : undefined}
            >
              {!activeThread ? (
                <div className="grid flex-1 place-items-center gap-3 text-sm text-neutral-500">
                  <p>Select a conversation</p>
                  <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => setComposeOpen(true)}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> New message
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex shrink-0 items-center gap-0.5 border-b border-white/8 bg-[#0a0a0a] px-1.5 py-2 pt-[max(0.5rem,env(safe-area-inset-top,0px))] md:px-2 md:pt-2.5">
                    <Button type="button" size="icon" variant="ghost" className="h-10 w-10 shrink-0 rounded-full" aria-label="Back" onClick={closeChat}>
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <Link to="/members/$id" params={{ id: activeThread.peer_id }} className="flex min-w-0 flex-1 items-center gap-2">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={activeThread.peer_avatar ?? undefined} />
                        <AvatarFallback>{activeThread.peer_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-neutral-100">{activeThread.peer_name}</p>
                        <p className="text-[10px] text-neutral-500">{activeThread.status === "request" ? "Message request" : "Active"}</p>
                      </div>
                    </Link>
                  </div>

                  <div className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 py-3 [-webkit-overflow-scrolling:touch]">
                    {messages.map((m) => {
                      if (m.deleted_at) return null;
                      const mine = m.sender_id === user.id;
                      return (
                        <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                          <div className={cn("max-w-[85%] rounded-[18px] px-3 py-2 text-[15px]", mine ? "bg-[#0A84FF] text-white" : "bg-[#3A3B3C] text-neutral-50")}>
                            {m.body?.startsWith("__voice__:") ? <p>🎤 Voice message</p> : m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                            {m.image_url && !m.body?.startsWith("__voice__:") && <img src={m.image_url} alt="" className="mt-1 max-h-48 rounded-lg object-cover" />}
                            <span className="mt-1 block text-[10px] opacity-70">{formatMsgTime(m.created_at)}</span>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={bottomRef} />
                  </div>

                  <div className="flex shrink-0 items-end gap-1.5 border-t border-white/8 bg-[#0a0a0a]/95 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]">
                    <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void sendPhoto(f); e.target.value = ""; }} />
                    <Button type="button" size="icon" variant="ghost" className="mb-0.5 h-9 w-9 shrink-0 rounded-full text-[#0A84FF]" disabled={busy} onClick={() => photoInputRef.current?.click()}>
                      <ImagePlus className="h-5 w-5" />
                    </Button>
                    <div className="flex min-h-[40px] min-w-0 flex-1 items-center rounded-[22px] border border-white/10 bg-[#3A3B3C] px-3 py-1.5">
                      <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Aa" enterKeyHint="send" autoComplete="off" className="h-8 border-0 bg-transparent px-0 text-[15px] shadow-none focus-visible:ring-0" onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }} />
                    </div>
                    <Button type="button" size="icon" disabled={busy || !text.trim()} onClick={() => void send()} className="mb-0.5 h-9 w-9 shrink-0 rounded-full bg-[#0A84FF] text-white">
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </>
              )}
            </section>
          </div>
        </div>

        {composeOpen && (
          <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70 sm:items-center sm:p-4">
            <div className="flex max-h-[min(88dvh,560px)] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#121214] shadow-2xl sm:rounded-3xl">
              <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-3 py-3">
                <h2 className="flex-1 text-sm font-semibold text-white">New message</h2>
                <button type="button" className="rounded-full p-1.5 text-neutral-400 hover:bg-white/10 hover:text-white" aria-label="Close" onClick={() => setComposeOpen(false)}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="shrink-0 border-b border-white/5 px-3 py-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                  <Input value={composeQ} onChange={(e) => setComposeQ(e.target.value)} placeholder="Search people or organizers…" autoFocus className="h-10 rounded-xl border-white/10 bg-white/[0.05] pl-9" />
                </div>
                <p className="mt-1.5 text-[11px] text-neutral-500">Message a player or organizer — same thread on their page</p>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                {!composeQ.trim() && followedOrgs.length > 0 && (
                  <p className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Organizers</p>
                )}
                {composeResults.length === 0 && (
                  <p className="px-4 py-10 text-center text-sm text-neutral-500">{composeQ.trim() ? "No matches" : "Type a name to find people or organizers"}</p>
                )}
                {composeResults.map((r) => (
                  <button key={`${r.kind}-${r.id}`} type="button" disabled={composeBusy} onClick={() => void startChatWithPeer(r.peerId, r.name)} className="flex w-full items-center gap-3 border-b border-white/5 px-4 py-3 text-left hover:bg-white/[0.04] disabled:opacity-50">
                    <div className="relative">
                      <Avatar className="h-11 w-11 rounded-xl">
                        <AvatarImage src={r.avatar ?? undefined} className="rounded-xl object-cover" />
                        <AvatarFallback className="rounded-xl">{r.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      {r.kind === "organizer" && (
                        <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-md border border-[#121214] bg-sky-500 text-white">
                          <Building2 className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1 truncate text-sm font-medium text-neutral-100">
                        <span className="truncate">{r.name}</span>
                        {r.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-sky-400" />}
                      </p>
                      <p className="truncate text-xs text-neutral-500">{r.subtitle}</p>
                    </div>
                    {composeBusy ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-neutral-500" /> : <MessageCircle className="h-4 w-4 shrink-0 text-neutral-500" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
