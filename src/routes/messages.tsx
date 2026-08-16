import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { useAuth } from "@/hooks/useAuth";
import { buildSeoHead } from "@/lib/seo";
import {
  formatMsgTime, getMyNote, listDmMessages, listDmThreads, listFriendNotes, markDmRead,
  sendDmMessage, type DmMessage, type DmThread, type UserNote,
} from "@/lib/dm";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ArrowLeft, BadgeCheck, ImagePlus, Loader2, Search, Send } from "lucide-react";
import { toast } from "sonner";
import { uploadPublicImage } from "@/lib/upload";

export const Route = createFileRoute("/messages")({
  validateSearch: (s: Record<string, unknown>): { with?: string; c?: string } => ({
    with: typeof s.with === "string" ? s.with : undefined,
    c: typeof s.c === "string" ? s.c : undefined,
  }),
  head: () => ({
    ...buildSeoHead({ title: "Messages — NepARENA", description: "Direct messages on NepARENA", path: "/messages" }),
  }),
  component: MessagesPage,
});

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
  const [tab, setTab] = useState<"inbox" | "requests">("inbox");
  const [query, setQuery] = useState("");
  const [myNote, setMyNoteState] = useState<UserNote | null>(null);
  const [friendNotes, setFriendNotes] = useState<UserNote[]>([]);
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

  const inbox = useMemo(() => threads.filter((t) => t.status === "active"), [threads]);
  const requests = useMemo(() => threads.filter((t) => t.status === "request"), [threads]);
  const chatHeads = useMemo(() => inbox.slice(0, 16), [inbox]);
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
      setMyNoteState(await getMyNote(user.id));
      setLoading(false);
    })();
  }, [user?.id]);

  useEffect(() => {
    if (!user || threads.length === 0) return;
    void (async () => {
      const peers = threads.map((t) => t.peer_id).filter(Boolean);
      if (peers.length) setFriendNotes(await listFriendNotes(peers));
    })();
  }, [user?.id, threads]);

  useEffect(() => {
    if (search.c) {
      setActiveId(search.c);
      setMobileChat(true);
    }
  }, [search.c]);

  useEffect(() => {
    if (!user || !activeId) return;
    void (async () => {
      setMessages(await listDmMessages(activeId));
      await markDmRead(activeId, user.id);
      await reloadThreads();
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    })();
  }, [user?.id, activeId]);

  const openThread = (id: string) => {
    setActiveId(id);
    setMobileChat(true);
    void navigate({ search: { c: id } });
  };

  const send = async () => {
    if (!user || !activeId || !text.trim() || busy) return;
    setBusy(true);
    const body = text.trim();
    setText("");
    const res = await sendDmMessage({ conversationId: activeId, senderId: user.id, body });
    setBusy(false);
    if (res.error) toast.error(res.error);
  };

  const sendPhoto = async (file: File) => {
    if (!user || !activeId || busy) return;
    setBusy(true);
    try {
      const url = await uploadPublicImage(file, "messages");
      const res = await sendDmMessage({ conversationId: activeId, senderId: user.id, body: "", imageUrl: url });
      if (res.error) toast.error(res.error);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Photo upload failed");
    }
    setBusy(false);
  };

  const noteFor = (userId: string) => friendNotes.find((n) => n.user_id === userId);

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
        <header className="z-40 shrink-0 border-b border-white/10 bg-[#0a0a0a]/95 backdrop-blur-md">
          <div className="mx-auto flex h-12 max-w-5xl items-center justify-between gap-2 px-3">
            <h1 className="text-[15px] font-semibold text-white">Messages</h1>
          </div>
        </header>

        <div className="mx-auto w-full max-w-5xl shrink-0 border-b border-white/5 px-2 pb-2 pt-[4px] sm:px-4">
          <div className="flex gap-3 overflow-x-auto overscroll-x-contain pb-1 [-webkit-overflow-scrolling:touch] scrollbar-none">
            <div className="relative flex w-16 shrink-0 flex-col items-center gap-1">
              <Avatar className="h-14 w-14 ring-2 ring-sky-500/50">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback>{(profile?.username || "U").slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="w-full truncate text-center text-[10px] text-neutral-400">You</span>
              {myNote && (
                <span className="absolute -top-1 left-1/2 z-10 max-w-[72px] -translate-x-1/2 truncate rounded-full bg-white px-1.5 py-0.5 text-[9px] font-medium text-black shadow">{myNote.body}</span>
              )}
            </div>
            {chatHeads.map((t) => {
              const n = noteFor(t.peer_id);
              return (
                <button key={t.conversation_id} type="button" onClick={() => openThread(t.conversation_id)} className="relative flex w-16 shrink-0 flex-col items-center gap-1">
                  <Avatar className={cn("h-14 w-14", t.unread > 0 && "ring-2 ring-sky-400")}>
                    <AvatarImage src={t.peer_avatar ?? undefined} />
                    <AvatarFallback>{t.peer_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="w-full truncate text-center text-[10px] text-neutral-400">{t.peer_name}</span>
                  {n && (
                    <span className="absolute -top-1 left-1/2 z-10 max-w-[72px] -translate-x-1/2 truncate rounded-full bg-white px-1.5 py-0.5 text-[9px] font-medium text-black shadow">{n.body}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col overflow-hidden px-2 pt-2 sm:px-4">
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

          <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-inner">
            <aside className={cn("flex h-full w-full min-h-0 flex-col border-r border-white/10 md:w-[320px] md:shrink-0", mobileChat && "hidden md:flex")}>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
                {loading && <p className="p-6 text-center text-sm text-neutral-500">Loading…</p>}
                {!loading && filteredList.length === 0 && (
                  <p className="p-6 text-center text-sm text-neutral-500">{query ? "No chats match." : tab === "requests" ? "No requests." : "No conversations yet."}</p>
                )}
                {filteredList.map((t) => (
                  <button key={t.conversation_id} type="button" onClick={() => openThread(t.conversation_id)} className={cn("flex w-full items-center gap-3 border-b border-white/5 px-3 py-3 text-left hover:bg-white/[0.04]", activeId === t.conversation_id && "bg-white/[0.06]")}>
                    <Avatar className="h-11 w-11">
                      <AvatarImage src={t.peer_avatar ?? undefined} />
                      <AvatarFallback>{t.peer_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="flex min-w-0 items-center gap-1 truncate text-sm font-medium text-neutral-100">
                          <span className="truncate">{t.peer_name}</span>
                          {t.peer_verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-sky-400" />}
                        </p>
                        {t.unread > 0 && <span className="shrink-0 rounded-full bg-sky-500 px-1.5 text-[10px] font-semibold text-white">{t.unread}</span>}
                      </div>
                      <p className="truncate text-xs text-neutral-500">{t.last_body || "Start chatting"}</p>
                    </div>
                  </button>
                ))}
              </div>
            </aside>

            <section
              className={cn(
                "flex min-h-0 flex-1 flex-col bg-[#0a0a0a]",
                !mobileChat && "hidden md:flex",
                mobileChat && "fixed inset-0 z-[100] flex h-[100dvh] max-h-[100dvh] w-full animate-in slide-in-from-right duration-200 md:static md:z-auto md:h-auto md:max-h-none md:animate-none",
              )}
            >
              {!activeThread ? (
                <div className="grid flex-1 place-items-center text-sm text-neutral-500">Select a conversation</div>
              ) : (
                <>
                  <div className="flex shrink-0 items-center gap-1 border-b border-white/8 bg-[#0a0a0a] px-1.5 py-2.5 pt-[max(0.5rem,env(safe-area-inset-top,0px))] md:px-2 md:pt-2.5">
                    <Button type="button" size="icon" variant="ghost" className="h-10 w-10 shrink-0 rounded-full md:hidden" aria-label="Back" onClick={() => { setMobileChat(false); void navigate({ search: {} }); }}>
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <Link to="/members/$id" params={{ id: activeThread.peer_id }} className="flex min-w-0 flex-1 items-center gap-2">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={activeThread.peer_avatar ?? undefined} />
                        <AvatarFallback>{activeThread.peer_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-neutral-100">{activeThread.peer_name}</p>
                        <p className="text-[10px] text-neutral-500">{activeThread.is_group ? "Group" : "Active"}</p>
                      </div>
                    </Link>
                  </div>
                  <div className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 py-3 [-webkit-overflow-scrolling:touch]">
                    {messages.map((m) => {
                      if (m.deleted_at) return null;
                      const mine = m.sender_id === user.id;
                      return (
                        <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                          <div className={cn("max-w-[78%] rounded-[18px] px-3 py-2 text-[15px]", mine ? "bg-[#0A84FF] text-white" : "bg-[#3A3B3C] text-neutral-50")}>
                            {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                            {m.image_url && <img src={m.image_url} alt="" className="mt-1 max-h-48 rounded-lg object-cover" />}
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
                      <Input
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Aa"
                        className="h-8 border-0 bg-transparent px-0 text-[15px] shadow-none focus-visible:ring-0"
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
                      />
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
      </div>
    </PageShell>
  );
}
