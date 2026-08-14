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
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ArrowLeft, ImagePlus, Loader2, Mic, Plus, Search, Send, Square, X } from "lucide-react";
import { toast } from "sonner";
import { PLATFORM_NAME } from "@/lib/organizers";
import { InlineStreak } from "@/components/StreakBadge";
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
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const recTimerRef = useRef<number | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const inbox = useMemo(() => threads.filter((t) => t.status === "active"), [threads]);
  const requests = useMemo(() => threads.filter((t) => t.status === "request"), [threads]);
  const chatHeads = useMemo(() => inbox.slice(0, 16), [inbox]);

  const filteredList = useMemo(() => {
    const base = tab === "requests" ? requests : inbox;
    if (!query.trim()) return base;
    const q = query.toLowerCase();
    return base.filter(
      (t) =>
        t.peer_name.toLowerCase().includes(q) ||
        (t.last_body ?? "").toLowerCase().includes(q),
    );
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

  const sendPhoto = async (file: File) => {
    if (!user || !activeId || busy) return;
    setBusy(true);
    try {
      const url = await uploadPublicImage(file, "messages");
      const res = await sendDmMessage({
        conversationId: activeId,
        senderId: user.id,
        body: "",
        imageUrl: url,
      });
      if (res.error) toast.error(res.error);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Photo upload failed");
    }
    setBusy(false);
  };

  const initials = (profile?.username || "U").slice(0, 2).toUpperCase();

  if (!user) {
    return (
      <PageShell force="platform" hideChrome>
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <p className="text-neutral-400">Sign in to view messages.</p>
          <Button asChild className="mt-4">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell force="platform" hideChrome>
      <div className="min-h-screen bg-[#0a0a0a]">
        <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0a0a0a]/95 backdrop-blur-md">
          <div className="mx-auto flex h-12 max-w-5xl items-center px-3">
            <h1 className="text-[15px] font-semibold text-white">Messages</h1>
          </div>
        </header>

        <div className="mx-auto flex h-[calc(100vh-3rem)] max-w-5xl flex-col px-2 py-3 sm:px-4">
          <div className="mb-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search conversations…"
              className="h-10 rounded-xl border-white/10 bg-white/[0.05]"
            />
          </div>

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
                        <p className="truncate text-xs text-neutral-500">{t.last_body?.startsWith("__voice__:") ? "🎤 Voice message" : (t.last_body || "Start chatting")}</p>
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
                  </div>
                  <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
                    {messages.map((m) => {
                      const mine = m.sender_id === user.id;
                      const shared = m.body ? parseSharedPost(m.body) : null;
                      const isVoice = !!m.body?.startsWith("__voice__:") && !!m.image_url;
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
                            ) : isVoice ? (
                              <div className="flex min-w-[160px] items-center gap-2">
                                <audio controls preload="metadata" src={m.image_url!} className="h-9 w-full max-w-[200px]" />
                              </div>
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
                  <div className="flex items-center gap-1.5 border-t border-white/10 p-2">
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void sendPhoto(f);
                        e.target.value = "";
                      }}
                    />
                    <Button type="button" size="icon" variant="ghost" className="shrink-0" disabled={busy} onClick={() => photoInputRef.current?.click()} aria-label="Send photo">
                      <ImagePlus className="h-4 w-4 text-neutral-400" />
                    </Button>
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
