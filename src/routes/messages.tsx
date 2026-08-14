import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { useAuth } from "@/hooks/useAuth";
import { buildSeoHead } from "@/lib/seo";
import {
  acceptDmRequest,
  declineDmRequest,
  deleteMyNote,
  formatMsgTime,
  getMyNote,
  listDmMessages,
  listDmThreads,
  listFriendNotes,
  markDmRead,
  reactToDm,
  sendDmMessage,
  setMyNote,
  type DmMessage,
  type DmThread,
  type UserNote,
} from "@/lib/dm";
import { parseSharedPost } from "@/lib/shared-post";
import { followUser, isFollowingUser } from "@/lib/user-follows";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ArrowLeft, Loader2, Plus, Search, Send, Smile, X } from "lucide-react";
import { toast } from "sonner";
import { PLATFORM_NAME } from "@/lib/organizers";
import { InlineStreak } from "@/components/StreakBadge";

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

const REACTIONS = ["❤️", "👍", "😂", "😮", "🔥", "⚽"];

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
  const [searchOpen, setSearchOpen] = useState(false);
  const [myNote, setMyNoteState] = useState<UserNote | null>(null);
  const [friendNotes, setFriendNotes] = useState<UserNote[]>([]);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const inbox = useMemo(() => threads.filter((t) => t.status === "active"), [threads]);
  const requests = useMemo(() => threads.filter((t) => t.status === "request"), [threads]);
  const chatHeads = useMemo(() => inbox.slice(0, 16), [inbox]);

  const filteredList = useMemo(() => {
    const base = tab === "requests" ? requests : inbox;
    if (!query.trim()) return base;
    const q = query.toLowerCase();
    return base.filter((t) => t.peer_name.toLowerCase().includes(q));
  }, [tab, requests, inbox, query]);

  const activeThread = useMemo(
    () => threads.find((t) => t.conversation_id === activeId) ?? null,
    [threads, activeId],
  );

  const reloadThreads = async () => {
    if (!user) return;
    const listAll = await listDmThreads(user.id);
    setThreads(listAll);
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
      const msgs = await listDmMessages(activeId);
      setMessages(msgs);
      await markDmRead(activeId, user.id);
      await reloadThreads();
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    })();
  }, [user?.id, activeId]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("dm-messages-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "dm_messages" },
        (payload) => {
          const row = payload.new as DmMessage;
          if (row.conversation_id === activeId) {
            setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 30);
          }
          void reloadThreads();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
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

  const saveNote = async () => {
    if (!user || !noteDraft.trim()) return;
    const res = await setMyNote(user.id, noteDraft);
    if (res.error) toast.error(res.error);
    else {
      setMyNoteState(await getMyNote(user.id));
      setNoteOpen(false);
      toast.success("Note saved (expires in 24h)");
    }
  };

  const initials = (profile?.display_name || profile?.username || "U").slice(0, 2).toUpperCase();

  if (!user) {
    return (
      <PageShell force="platform" hideChrome>
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <p className="text-neutral-400">Sign in to view messages.</p>
          <Button asChild className="mt-4">
            <Link to="/auth/login">Sign in</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell force="platform" hideChrome>
      <div className="min-h-screen bg-[#0a0a0a]">
        <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0a0a0a]/95 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-3">
            <Link to="/" className="flex shrink-0 items-center gap-2">
              <img src="/neparena-logo.png" alt="" className="h-8 w-8 rounded-lg object-cover ring-1 ring-white/20" onError={(e) => { e.currentTarget.src = "/pwa-192x192.png"; }} />
              <span className="text-base font-semibold text-white">{PLATFORM_NAME}</span>
            </Link>
            <div className="ml-auto flex items-center gap-2">
              <button type="button" onClick={() => setSearchOpen((v) => !v)} className="grid h-9 w-9 place-items-center rounded-full text-neutral-400 hover:bg-white/5" aria-label="Search conversations">
                <Search className="h-5 w-5" />
              </button>
              {user && (
                <Link to="/members/$id" params={{ id: user.id }} className="rounded-full ring-1 ring-white/15">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                </Link>
              )}
            </div>
          </div>
        </header>

        <div className="mx-auto flex h-[calc(100vh-3.5rem)] max-w-5xl flex-col px-2 py-3 sm:px-4">
          {/* One horizontal strip: You + notes + chat heads (Instagram-style) */}
          <div className="mb-3 mt-1 flex flex-nowrap items-start gap-3 overflow-x-auto px-1 pb-2 pt-2 scrollbar-thin">
            {/* Your avatar + note bubble */}
            <button
              type="button"
              onClick={() => {
                setNoteDraft(myNote?.body ?? "");
                setNoteOpen(true);
              }}
              className="relative shrink-0 pt-7 text-center"
            >
              <div className="absolute left-1/2 top-0 z-10 w-max max-w-[4.75rem] -translate-x-1/2">
                <div className="rounded-2xl bg-white px-2 py-1 text-[10px] font-medium leading-tight text-black shadow-md">
                  <span className="line-clamp-2">{myNote?.body || "Your note"}</span>
                </div>
                <div className="mx-auto h-0 w-0 border-x-[5px] border-t-[6px] border-x-transparent border-t-white" />
              </div>
              <div className="relative mx-auto mt-0.5">
                <Avatar className="h-14 w-14 ring-2 ring-sky-500/40 ring-offset-2 ring-offset-[#0a0a0a]">
                  <AvatarImage src={profile?.avatar_url ?? undefined} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-sky-500 text-white">
                  <Plus className="h-3 w-3" />
                </span>
              </div>
              <p className="mt-1 max-w-[3.5rem] truncate text-[10px] text-sky-300">You</p>
            </button>

            {/* Friends with active notes */}
            {friendNotes.map((n) => {
              const thread = chatHeads.find((t) => t.peer_id === n.user_id) || threads.find((t) => t.peer_id === n.user_id);
              return (
                <button
                  key={`note-${n.user_id}`}
                  type="button"
                  onClick={() => {
                    if (thread) openThread(thread.conversation_id);
                  }}
                  className="relative shrink-0 pt-7 text-center"
                >
                  {n.body && (
                    <div className="absolute left-1/2 top-0 z-10 w-max max-w-[4.75rem] -translate-x-1/2">
                      <div className="rounded-2xl bg-white px-2 py-1 text-[10px] font-medium leading-tight text-black shadow-md">
                        <span className="line-clamp-2">{n.body}</span>
                      </div>
                      <div className="mx-auto h-0 w-0 border-x-[5px] border-t-[6px] border-x-transparent border-t-white" />
                    </div>
                  )}
                  <Avatar className="relative mt-0.5 h-14 w-14 ring-2 ring-white/15 ring-offset-2 ring-offset-[#0a0a0a]">
                    <AvatarImage src={n.avatar ?? undefined} />
                    <AvatarFallback>{(n.name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <p className="mt-1 max-w-[3.5rem] truncate text-[9px] text-neutral-500">
                    {(n.name ?? "").split(" ")[0]}
                  </p>
                </button>
              );
            })}

            {/* Active chats without a note (same horizontal row) */}
            {chatHeads
              .filter((t) => !friendNotes.some((n) => n.user_id === t.peer_id))
              .map((t) => (
                <button
                  key={t.conversation_id}
                  type="button"
                  onClick={() => openThread(t.conversation_id)}
                  className="relative shrink-0 pt-7 text-center"
                >
                  <Avatar
                    className={cn(
                      "relative mt-0.5 h-14 w-14 ring-2 ring-offset-2 ring-offset-[#0a0a0a]",
                      activeId === t.conversation_id ? "ring-sky-400" : "ring-white/10",
                    )}
                  >
                    <AvatarImage src={t.peer_avatar ?? undefined} />
                    <AvatarFallback>{t.peer_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  {t.unread > 0 && (
                    <span className="absolute right-0 top-7 h-3 w-3 rounded-full bg-sky-400 ring-2 ring-[#0a0a0a]" />
                  )}
                  <p className="mt-1 max-w-[3.5rem] truncate text-[10px] text-neutral-300">
                    {t.peer_name.split(" ")[0]}
                  </p>
                </button>
              ))}
          </div>

          {noteOpen && (
            <div className="mb-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <p className="mb-1 text-xs font-semibold text-neutral-300">Note (max 20 chars · expires in 24h)</p>
              <div className="flex flex-wrap gap-2">
                <Input
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value.slice(0, 20))}
                  placeholder="What's up?"
                  className="min-w-[8rem] flex-1 border-white/10 bg-black/30"
                  maxLength={20}
                />
                <Button size="sm" className="bg-sky-500 text-white" onClick={() => void saveNote()}>
                  Save
                </Button>
                {myNote && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-rose-300 hover:text-rose-200"
                    onClick={async () => {
                      if (user) {
                        await deleteMyNote(user.id);
                        setMyNoteState(null);
                        setNoteDraft("");
                        setNoteOpen(false);
                        toast.success("Note deleted");
                      }
                    }}
                  >
                    Delete
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setNoteOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}

          {searchOpen && (
            <div className="mb-2 flex items-center gap-2">
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search chats…" className="border-white/10 bg-black/30" autoFocus />
              <Button size="icon" variant="ghost" onClick={() => { setQuery(""); setSearchOpen(false); }}><X className="h-4 w-4" /></Button>
            </div>
          )}

          <div className="mb-2 flex gap-2">
            <button type="button" onClick={() => setTab("inbox")} className={cn("rounded-full px-3 py-1 text-xs font-semibold", tab === "inbox" ? "bg-sky-500 text-white" : "bg-white/5 text-neutral-400")}>Inbox</button>
            <button type="button" onClick={() => setTab("requests")} className={cn("rounded-full px-3 py-1 text-xs font-semibold", tab === "requests" ? "bg-sky-500 text-white" : "bg-white/5 text-neutral-400")}>Requests{requests.length > 0 ? ` (${requests.length})` : ""}</button>
          </div>

          <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
            <aside className={cn("w-full border-r border-white/10 md:w-[320px] md:shrink-0", mobileChat && "hidden md:block")}>
              <div className="h-full overflow-y-auto">
                {loading && <p className="p-6 text-center text-sm text-neutral-500">Loading…</p>}
                {!loading && filteredList.length === 0 && (
                  <p className="p-6 text-center text-sm text-neutral-500">{query ? "No chats match your search." : tab === "requests" ? "No message requests." : "No conversations yet. Open a profile and tap Message."}</p>
                )}
                {filteredList.map((t) => (
                  <div key={t.conversation_id} className={cn("border-b border-white/5 px-3 py-3 transition hover:bg-white/[0.04]", activeId === t.conversation_id && "bg-white/[0.06]")}>
                    <button type="button" onClick={() => openThread(t.conversation_id)} className="flex w-full items-center gap-3 text-left">
                      <Avatar className="h-11 w-11">
                        <AvatarImage src={t.peer_avatar ?? undefined} />
                        <AvatarFallback>{t.peer_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium text-neutral-100">{t.peer_name}</p>
                          {t.unread > 0 && <span className="shrink-0 rounded-full bg-sky-500 px-1.5 text-[10px] font-semibold text-white">{t.unread}</span>}
                        </div>
                        <p className="truncate text-xs text-neutral-500">{t.last_body || "Start chatting"}</p>
                      </div>
                    </button>
                    {tab === "requests" && t.status === "request" && (
                      <div className="mt-2 flex gap-2 pl-14">
                        <Button size="sm" className="h-7 bg-sky-500 text-xs text-white" onClick={() => void acceptDmRequest(t.conversation_id).then(() => reloadThreads())}>Accept</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-rose-300" onClick={() => void declineDmRequest(t.conversation_id).then(() => reloadThreads())}>Decline</Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </aside>

            <section className={cn("flex min-h-0 flex-1 flex-col", !mobileChat && "hidden md:flex")}>
              {!activeThread ? (
                <div className="grid flex-1 place-items-center text-sm text-neutral-500">Select a conversation</div>
              ) : (
                <>
                  <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
                    <Button type="button" size="icon" variant="ghost" className="md:hidden" onClick={() => { setMobileChat(false); void navigate({ search: {} }); }}>
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <Link to="/members/$id" params={{ id: activeThread.peer_id }} className="flex min-w-0 items-center gap-2">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={activeThread.peer_avatar ?? undefined} />
                        <AvatarFallback>{activeThread.peer_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-neutral-100">{activeThread.peer_name}</p>
                        <p className="text-[10px] text-neutral-500">{activeThread.status === "request" ? "Message request" : "NepARENA chat"}</p>
                      </div>
                    </Link>
                    <InlineStreak userId={activeThread.peer_id} className="ml-auto" />
                  </div>
                  <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
                    {messages.map((m) => {
                      const mine = m.sender_id === user.id;
                      const shared = m.body ? parseSharedPost(m.body) : null;
                      return (
                        <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                          <div className={cn("max-w-[75%] rounded-2xl px-3 py-2 text-sm", mine ? "bg-sky-500 text-white" : "bg-white/10 text-neutral-100")}>
                            {shared ? (
                              <a href={shared.url} className="block">
                                <div className="rounded-xl bg-black/20 p-2">
                                  <p className="text-xs font-semibold">{shared.authorName}</p>
                                  {shared.text && <p className="mt-0.5 line-clamp-3 text-xs opacity-90">{shared.text}</p>}
                                </div>
                              </a>
                            ) : (
                              <>
                                {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                                {m.image_url && <img src={m.image_url} alt="" className="mt-1 max-h-48 rounded-lg object-cover" />}
                              </>
                            )}
                            <div className="mt-1 flex items-center justify-between gap-2">
                              <span className="text-[10px] opacity-70">{formatMsgTime(m.created_at)}</span>
                              <div className="flex gap-0.5">
                                {REACTIONS.map((r) => (
                                  <button key={r} type="button" className="text-[11px] opacity-60 hover:opacity-100" onClick={() => void reactToDm(m.id, m.reaction === r ? null : r)}>{r}</button>
                                ))}
                              </div>
                            </div>
                            {m.reaction && <span className="mt-0.5 inline-block rounded-full bg-black/30 px-1.5 text-xs">{m.reaction}</span>}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={bottomRef} />
                  </div>
                  <div className="flex items-center gap-2 border-t border-white/10 p-2">
                    <Button type="button" size="icon" variant="ghost" className="shrink-0"><Smile className="h-4 w-4 text-neutral-400" /></Button>
                    <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message…" className="border-white/10 bg-white/5" onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }} />
                    <Button type="button" size="icon" disabled={busy || !text.trim()} onClick={() => void send()} className="shrink-0 bg-sky-500 text-white hover:bg-sky-400">
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
