import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { useAuth } from "@/hooks/useAuth";
import { buildSeoHead } from "@/lib/seo";
import {
  acceptDmRequest, declineDmRequest, deleteMyNote, formatMsgTime, getMyNote,
  listDmMessages, listDmThreads, listFriendNotes, markDmRead, reactToDm,
  sendDmMessage, setMyNote, deleteDmMessage, createGroupChat,
  type DmMessage, type DmThread, type UserNote,
} from "@/lib/dm";
import { parseSharedPost } from "@/lib/shared-post";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, BadgeCheck, ImagePlus, Loader2, Mic, MoreVertical, Plus, Search, Send,
  Square, StickyNote, Trash2, UserPlus, Users, X,
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

const REACTIONS = ["❤️", "👍", "😂", "😮", "🔥", "⚽"];

function dayKey(iso: string) {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  } catch {
    return iso.slice(0, 10);
  }
}

function dayLabel(iso: string) {
  try {
    const d = new Date(iso);
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startMsg = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diff = Math.round((startToday - startMsg) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function clusterSide(messages: DmMessage[], index: number, myId: string) {
  const m = messages[index]!;
  const mine = m.sender_id === myId;
  const prev = messages[index - 1];
  const next = messages[index + 1];
  const samePrev =
    !!prev &&
    prev.sender_id === m.sender_id &&
    !prev.deleted_at &&
    dayKey(prev.created_at) === dayKey(m.created_at);
  const sameNext =
    !!next &&
    next.sender_id === m.sender_id &&
    !next.deleted_at &&
    dayKey(next.created_at) === dayKey(m.created_at);
  const r = "rounded-[18px]";
  if (mine) {
    return cn(
      r,
      samePrev ? "rounded-tr-md" : "rounded-tr-[18px]",
      sameNext ? "rounded-br-md" : "rounded-br-[18px]",
    );
  }
  return cn(
    r,
    samePrev ? "rounded-tl-md" : "rounded-tl-[18px]",
    sameNext ? "rounded-bl-md" : "rounded-bl-[18px]",
  );
}

function isLastInCluster(messages: DmMessage[], index: number) {
  const m = messages[index]!;
  const next = messages[index + 1];
  if (!next) return true;
  return next.sender_id !== m.sender_id || dayKey(next.created_at) !== dayKey(m.created_at);
}

type FriendOpt = { id: string; name: string; avatar: string | null };

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
  const [noteDraft, setNoteDraft] = useState("");
  const [ownMenuOpen, setOwnMenuOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [groupTitle, setGroupTitle] = useState("");
  const [friends, setFriends] = useState<FriendOpt[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [threadMenuId, setThreadMenuId] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [longPressMsgId, setLongPressMsgId] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const recordStartedAt = useRef(0);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    setThreads(await listDmThreads(user.id));
  };

  const loadFriends = async () => {
    if (!user) return;
    const { data: fl } = await supabase
      .from("user_follows")
      .select("following_id")
      .eq("follower_id", user.id)
      .limit(80);
    const ids = (fl ?? []).map((r: { following_id: string }) => r.following_id);
    if (!ids.length) {
      setFriends([]);
      return;
    }
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .in("id", ids);
    setFriends(
      ((profs ?? []) as { id: string; username: string | null; full_name: string | null; avatar_url: string | null }[]).map(
        (p) => ({
          id: p.id,
          name: (p.full_name || p.username || "Player").trim(),
          avatar: p.avatar_url,
        }),
      ),
    );
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

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("dm-messages-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "dm_messages" }, (payload) => {
        const row = payload.new as DmMessage;
        if (row.conversation_id === activeId) {
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 30);
        }
        void reloadThreads();
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user?.id, activeId]);

  const openThread = (id: string) => {
    setActiveId(id);
    setMobileChat(true);
    setThreadMenuId(null);
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

  const startVoice = async () => {
    if (!user || !activeId || busy || recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      mediaRecorderRef.current = mr;
      recordStartedAt.current = Date.now();
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const duration = Math.max(1, Math.round((Date.now() - recordStartedAt.current) / 1000));
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        if (blob.size < 500) {
          toast.error("Recording too short");
          return;
        }
        setBusy(true);
        try {
          const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type });
          const url = await uploadPublicImage(file, "messages");
          const res = await sendDmMessage({
            conversationId: activeId!,
            senderId: user!.id,
            body: `__voice__:${duration}`,
            imageUrl: url,
          });
          if (res.error) toast.error(res.error);
          else toast.success("Voice sent");
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Voice upload failed");
        }
        setBusy(false);
      };
      mr.start();
      setRecording(true);
      toast.message("Recording… tap stop when done");
    } catch {
      toast.error("Microphone permission denied");
    }
  };

  const stopVoice = () => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") mr.stop();
  };

  const removeMessage = async (id: string) => {
    const res = await deleteDmMessage(id);
    if (res.error) toast.error(res.error);
    else {
      setMessages((prev) => prev.filter((m) => m.id !== id));
      setLongPressMsgId(null);
      toast.success("Deleted");
    }
  };

  const openCreateGroup = async () => {
    setGroupOpen(true);
    setSelectedFriends([]);
    setGroupTitle("");
    await loadFriends();
  };

  const submitGroup = async () => {
    if (!user || busy) return;
    if (selectedFriends.length < 2) {
      toast.error("Select at least 2 friends");
      return;
    }
    setBusy(true);
    const res = await createGroupChat(groupTitle.trim() || "Group", selectedFriends);
    setBusy(false);
    if (res.error) toast.error(res.error);
    else {
      toast.success("Group created");
      setGroupOpen(false);
      setGroupTitle("");
      setSelectedFriends([]);
      await reloadThreads();
      if (res.id) openThread(res.id);
    }
  };

  const saveNote = async () => {
    if (!user || !noteDraft.trim()) return;
    const res = await setMyNote(user.id, noteDraft.trim());
    if (res.error) toast.error(res.error);
    else {
      setMyNoteState(await getMyNote(user.id));
      setNoteOpen(false);
      setNoteDraft("");
      toast.success("Note set (24h)");
    }
  };

  const voiceDuration = (body: string | null) => {
    if (!body?.startsWith("__voice__:")) return null;
    const n = Number(body.slice("__voice__:".length));
    return Number.isFinite(n) ? n : null;
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
      <div className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-[#0a0a0a] pb-[calc(5rem+env(safe-area-inset-bottom,0px))]">
        <header className="z-40 shrink-0 border-b border-white/10 bg-[#0a0a0a]/95 backdrop-blur-md">
          <div className="mx-auto flex h-12 max-w-5xl items-center justify-between gap-2 px-3">
            <h1 className="text-[15px] font-semibold text-white">Messages</h1>
            <Button type="button" size="sm" variant="outline" className="h-8 rounded-full border-white/15 text-xs" onClick={() => void openCreateGroup()}>
              <Users className="mr-1 h-3.5 w-3.5" /> Group
            </Button>
          </div>
        </header>

        <div className="mx-auto w-full max-w-5xl shrink-0 border-b border-white/5 px-2 py-2 sm:px-4">
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
            <button type="button" onClick={() => setOwnMenuOpen((v) => !v)} className="relative flex w-16 shrink-0 flex-col items-center gap-1">
              <div className="relative">
                <Avatar className="h-14 w-14 ring-2 ring-sky-500/50">
                  <AvatarImage src={profile?.avatar_url ?? undefined} />
                  <AvatarFallback>{(profile?.username || "U").slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-sky-500 text-white ring-2 ring-[#0a0a0a]">
                  <Plus className="h-3 w-3" />
                </span>
              </div>
              <span className="w-full truncate text-center text-[10px] text-neutral-400">Your note</span>
              {myNote && (
                <span className="absolute -top-1 left-1/2 z-10 max-w-[72px] -translate-x-1/2 truncate rounded-full bg-white px-1.5 py-0.5 text-[9px] font-medium text-black shadow">{myNote.body}</span>
              )}
            </button>
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

        <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col overflow-hidden px-2 py-2 sm:px-4">
          <div className="mb-2 shrink-0">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search conversations…" className="h-10 rounded-xl border-white/10 bg-white/[0.05] pl-9" />
            </div>
          </div>

          <div className="mb-2 flex shrink-0 gap-2">
            <button type="button" onClick={() => setTab("inbox")} className={cn("rounded-full px-3 py-1 text-xs font-semibold transition", tab === "inbox" ? "bg-sky-500 text-white" : "bg-white/5 text-neutral-400")}>Inbox</button>
            <button type="button" onClick={() => setTab("requests")} className={cn("rounded-full px-3 py-1 text-xs font-semibold transition", tab === "requests" ? "bg-sky-500 text-white" : "bg-white/5 text-neutral-400")}>Requests{requests.length > 0 ? ` (${requests.length})` : ""}</button>
          </div>

          <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-inner">
            <aside className={cn("w-full border-r border-white/10 md:w-[320px] md:shrink-0", mobileChat && "hidden md:block")}>
              <div className="h-full overflow-y-auto">
                {loading && <p className="p-6 text-center text-sm text-neutral-500">Loading…</p>}
                {!loading && filteredList.length === 0 && (
                  <p className="p-6 text-center text-sm text-neutral-500">{query ? "No chats match." : tab === "requests" ? "No requests." : "No conversations yet."}</p>
                )}
                {filteredList.map((t) => (
                  <div key={t.conversation_id} className={cn("relative border-b border-white/5 px-3 py-3 transition hover:bg-white/[0.04]", activeId === t.conversation_id && "bg-white/[0.06]")}>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => openThread(t.conversation_id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                        <Avatar className="h-11 w-11">
                          <AvatarImage src={t.peer_avatar ?? undefined} />
                          <AvatarFallback>{t.peer_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="flex min-w-0 items-center gap-1 truncate text-sm font-medium text-neutral-100"><span className="truncate">{t.peer_name}</span>{t.peer_verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-sky-400" />}</p>
                            {t.unread > 0 && <span className="shrink-0 rounded-full bg-sky-500 px-1.5 text-[10px] font-semibold text-white">{t.unread}</span>}
                          </div>
                          <p className="truncate text-xs text-neutral-500">{t.last_body?.startsWith("__voice__:") ? "🎤 Voice message" : (t.last_body || "Start chatting")}</p>
                        </div>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </aside>

            <section className={cn("flex min-h-0 flex-1 flex-col", !mobileChat && "hidden md:flex")}>
              {!activeThread ? (
                <div className="grid flex-1 place-items-center text-sm text-neutral-500">Select a conversation</div>
              ) : (
                <>
                  <div className="flex shrink-0 items-center gap-2 border-b border-white/8 bg-[#0a0a0a]/95 px-2 py-2.5 backdrop-blur-md">
                    <Button type="button" size="icon" variant="ghost" className="md:hidden" onClick={() => { setMobileChat(false); void navigate({ search: {} }); }}>
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <Link to="/members/$id" params={{ id: activeThread.peer_id }} className="flex min-w-0 flex-1 items-center gap-2">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={activeThread.peer_avatar ?? undefined} />
                        <AvatarFallback>{activeThread.peer_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="flex min-w-0 items-center gap-1 truncate text-sm font-semibold text-neutral-100"><span className="truncate">{activeThread.peer_name}</span>{activeThread.peer_verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-sky-400" />}</p>
                        <p className="text-[10px] text-neutral-500">
                          {activeThread.is_group ? "Group chat" : activeThread.status === "request" ? "Message request" : "Active now"}
                        </p>
                      </div>
                    </Link>
                  </div>
                  <div className="messenger-scroll min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain bg-[radial-gradient(ellipse_at_top,_rgba(10,132,255,0.07),_transparent_55%)] px-3 py-3 [-webkit-overflow-scrolling:touch]">
                    {messages.map((m, idx) => {
                      if (m.deleted_at) return null;
                      const mine = m.sender_id === user.id;
                      const isVoice = !!m.body?.startsWith("__voice__:") && !!m.image_url;
                      const vDur = voiceDuration(m.body);
                      const showDay = idx === 0 || dayKey(messages[idx - 1]!.created_at) !== dayKey(m.created_at);
                      const lastCluster = isLastInCluster(messages, idx);
                      const bubbleShape = clusterSide(messages, idx, user.id);
                      return (
                        <div key={m.id}>
                          {showDay && (
                            <div className="my-3 flex justify-center">
                              <span className="rounded-full bg-black/50 px-3 py-0.5 text-[11px] font-medium text-neutral-300 ring-1 ring-white/10 backdrop-blur-sm">
                                {dayLabel(m.created_at)}
                              </span>
                            </div>
                          )}
                          <div className={cn("flex", mine ? "justify-end" : "justify-start", lastCluster ? "mb-2" : "mb-0.5")}>
                            <div
                              className={cn(
                                "relative max-w-[78%] px-3 py-2 text-[15px] leading-snug shadow-sm",
                                bubbleShape,
                                mine ? "bg-[#0A84FF] text-white" : "bg-[#3A3B3C] text-neutral-50",
                              )}
                            >
                              {isVoice ? (
                                <div className="space-y-1">
                                  <audio controls preload="metadata" src={m.image_url!} className="h-9 w-full max-w-[200px]" />
                                  {vDur != null && <p className="text-[10px] opacity-70">🎤 {vDur}s</p>}
                                </div>
                              ) : (
                                <>
                                  {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                                  {m.image_url && !isVoice && (
                                    <img src={m.image_url} alt="" className="mt-1 max-h-48 rounded-lg object-cover" />
                                  )}
                                </>
                              )}
                              {lastCluster && (
                                <span className="mt-1 block text-[10px] opacity-70">
                                  {formatMsgTime(m.created_at)}
                                  {mine && <span className="ml-1">Sent</span>}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={bottomRef} />
                  </div>
                  <div className="flex shrink-0 items-end gap-1.5 border-t border-white/8 bg-[#0a0a0a]/95 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] backdrop-blur-md">
                    <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void sendPhoto(f); e.target.value = ""; }} />
                    <Button type="button" size="icon" variant="ghost" className="mb-0.5 h-9 w-9 shrink-0 rounded-full text-[#0A84FF] hover:bg-[#0A84FF]/15" disabled={busy || recording} onClick={() => photoInputRef.current?.click()} aria-label="Send photo">
                      <ImagePlus className="h-5 w-5" />
                    </Button>
                    {recording ? (
                      <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-2">
                        <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-rose-500" />
                        <span className="text-sm text-rose-200">Recording…</span>
                        <Button type="button" size="sm" className="ml-auto h-8 rounded-full bg-rose-500 text-white" onClick={stopVoice}>
                          <Square className="h-3 w-3 fill-current" /> Send
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex min-h-[40px] min-w-0 flex-1 items-center rounded-[22px] border border-white/10 bg-[#3A3B3C] px-3 py-1.5 focus-within:border-[#0A84FF]/50">
                          <Input
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Aa"
                            className="h-8 border-0 bg-transparent px-0 text-[15px] text-neutral-100 shadow-none placeholder:text-neutral-400 focus-visible:ring-0"
                            disabled={recording}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                void send();
                              }
                            }}
                          />
                        </div>
                        {text.trim() ? (
                          <Button type="button" size="icon" disabled={busy} onClick={() => void send()} className="mb-0.5 h-9 w-9 shrink-0 rounded-full bg-[#0A84FF] text-white hover:bg-[#0077ED]">
                            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          </Button>
                        ) : (
                          <Button type="button" size="icon" disabled={busy} onClick={() => void startVoice()} className="mb-0.5 h-9 w-9 shrink-0 rounded-full bg-[#0A84FF] text-white hover:bg-[#0077ED]" aria-label="Record voice">
                            <Mic className="h-4 w-4" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}
            </section>
          </div>
        </div>
      </div>

      {noteOpen && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 backdrop-blur-sm p-4 sm:items-center" onClick={() => setNoteOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-white/12 bg-[#121214] p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-white">Your note</h3>
            <Input className="mt-3 border-white/10 bg-white/5" maxLength={60} placeholder="What's up?" value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} />
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => setNoteOpen(false)}>Cancel</Button>
              <Button type="button" size="sm" className="bg-sky-500 text-white" disabled={!noteDraft.trim()} onClick={() => void saveNote()}>Save</Button>
            </div>
          </div>
        </div>
      )}

      {groupOpen && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 backdrop-blur-sm p-4 sm:items-center" onClick={() => setGroupOpen(false)}>
          <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl border border-white/12 bg-[#121214] p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-white">New group</h3>
            <Input className="mt-3 border-white/10 bg-white/5" placeholder="Group name" value={groupTitle} onChange={(e) => setGroupTitle(e.target.value)} />
            <div className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto">
              {friends.map((f) => {
                const on = selectedFriends.includes(f.id);
                return (
                  <button key={f.id} type="button" onClick={() => setSelectedFriends((prev) => on ? prev.filter((x) => x !== f.id) : [...prev, f.id])} className={cn("flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left", on ? "bg-sky-500/20" : "hover:bg-white/5")}>
                    <Avatar className="h-9 w-9"><AvatarImage src={f.avatar ?? undefined} /><AvatarFallback>{f.name.slice(0, 2)}</AvatarFallback></Avatar>
                    <span className="flex-1 truncate text-sm text-white">{f.name}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => setGroupOpen(false)}>Cancel</Button>
              <Button type="button" size="sm" disabled={busy || selectedFriends.length < 2} className="bg-sky-500 text-white" onClick={() => void submitGroup()}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}</Button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
