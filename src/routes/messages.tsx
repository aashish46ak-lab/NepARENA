import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { useAuth } from "@/hooks/useAuth";
import { buildSeoHead } from "@/lib/seo";
import {
  formatMsgTime,
  getMyNote,
  listDmMessages,
  listDmThreads,
  listFriendNotes,
  markDmRead,
  sendDmMessage,
  deleteDmMessage,
  type DmMessage,
  type DmThread,
  type UserNote,
} from "@/lib/dm";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  BadgeCheck,
  ImagePlus,
  Loader2,
  Mic,
  MoreVertical,
  Pause,
  Play,
  Search,
  Send,
  Square,
  Trash2,
  User as UserIcon,
  Volume2,
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

function voiceDurationSec(body: string | null): number | null {
  if (!body?.startsWith("__voice__:")) return null;
  const n = Number(body.slice("__voice__:".length));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function formatVoiceLen(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Messenger-style voice bubble: play + waveform strip + duration */
function VoiceBubble({
  src,
  durationSec,
  mine,
}: {
  src: string;
  durationSec: number | null;
  mine: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [current, setCurrent] = useState(0);
  const bars = useMemo(
    () => Array.from({ length: 28 }, (_, i) => 0.25 + ((i * 17) % 10) / 14),
    [],
  );

  useEffect(() => {
    const a = new Audio(src);
    a.preload = "metadata";
    audioRef.current = a;
    const onTime = () => {
      if (!a.duration || !Number.isFinite(a.duration)) return;
      setProgress(a.currentTime / a.duration);
      setCurrent(Math.floor(a.currentTime));
    };
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
      setCurrent(0);
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);
    return () => {
      a.pause();
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnd);
      audioRef.current = null;
    };
  }, [src]);

  const toggle = async () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
      return;
    }
    try {
      await a.play();
      setPlaying(true);
    } catch {
      toast.error("Could not play voice message");
    }
  };

  const shown = durationSec != null ? (playing ? current : durationSec) : current;
  const label = durationSec != null || current > 0 ? formatVoiceLen(shown) : "0:00";

  return (
    <div
      className={cn(
        "flex min-w-[200px] max-w-[260px] items-center gap-2.5 rounded-[22px] px-2.5 py-2",
        mine ? "bg-[#0A84FF]" : "bg-[#3A3B3C]",
      )}
    >
      <button
        type="button"
        onClick={() => void toggle()}
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-full",
          mine ? "bg-white/20 text-white" : "bg-white/15 text-white",
        )}
        aria-label={playing ? "Pause voice message" : "Play voice message"}
      >
        {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current pl-0.5" />}
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex h-6 items-end gap-[2px]">
          {bars.map((h, i) => {
            const filled = progress > 0 && i / bars.length <= progress;
            return (
              <span
                key={i}
                className={cn(
                  "w-[3px] rounded-full transition-colors",
                  filled ? (mine ? "bg-white" : "bg-sky-300") : mine ? "bg-white/35" : "bg-white/25",
                )}
                style={{ height: `${Math.round(h * 100)}%` }}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-between gap-2 text-[11px] opacity-80">
          <span className="tabular-nums">{label}</span>
          <Volume2 className="h-3 w-3 opacity-60" />
        </div>
      </div>
    </div>
  );
}

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
  const [myNote, setMyNoteState] = useState<UserNote | null>(null);
  const [friendNotes, setFriendNotes] = useState<UserNote[]>([]);
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordStartedAt = useRef(0);
  const recordTickRef = useRef<number | null>(null);

  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    const y = window.scrollY || 0;
    const prev = {
      o: body.style.overflow,
      p: body.style.position,
      t: body.style.top,
      w: body.style.width,
      ho: html.style.overflow,
    };
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

  // Keyboard-aware composer: slide typing bar above soft keyboard (mobile chat)
  useEffect(() => {
    if (!mobileChat) {
      setKbInset(0);
      return;
    }
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKbInset(inset > 40 ? inset : 0);
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ block: "end" });
      });
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [mobileChat]);

  useEffect(() => {
    if (!recording) {
      setRecordSecs(0);
      if (recordTickRef.current) {
        window.clearInterval(recordTickRef.current);
        recordTickRef.current = null;
      }
      return;
    }
    recordTickRef.current = window.setInterval(() => {
      setRecordSecs(Math.max(1, Math.round((Date.now() - recordStartedAt.current) / 1000)));
    }, 250);
    return () => {
      if (recordTickRef.current) window.clearInterval(recordTickRef.current);
    };
  }, [recording]);

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
      const res = await sendDmMessage({
        conversationId: activeId,
        senderId: user.id,
        body: "",
        imageUrl: url,
      });
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
        if (blob.size < 400) {
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
          else {
            setMessages(await listDmMessages(activeId!));
            await reloadThreads();
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 40);
          }
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Voice upload failed");
        }
        setBusy(false);
      };
      mr.start();
      setRecording(true);
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
    else if (activeId) setMessages(await listDmMessages(activeId));
  };

  const noteFor = (userId: string) => friendNotes.find((n) => n.user_id === userId);

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
            </div>
          </header>
        )}

        {!mobileChat && (
          <div className="mx-auto w-full max-w-5xl shrink-0 border-b border-white/5 px-2 pb-2 pt-[4px] sm:px-4">
            <div className="flex gap-3 overflow-x-auto overscroll-x-contain pb-1 [-webkit-overflow-scrolling:touch] scrollbar-none">
              <div className="relative flex w-16 shrink-0 flex-col items-center gap-1">
                <Avatar className="h-14 w-14 ring-2 ring-sky-500/50">
                  <AvatarImage src={profile?.avatar_url ?? undefined} />
                  <AvatarFallback>
                    {(profile?.username || "U").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="w-full truncate text-center text-[10px] text-neutral-400">You</span>
                {myNote && (
                  <span className="absolute -top-1 left-1/2 z-10 max-w-[72px] -translate-x-1/2 truncate rounded-full bg-white px-1.5 py-0.5 text-[9px] font-medium text-black shadow">
                    {myNote.body}
                  </span>
                )}
              </div>
              {chatHeads.map((t) => {
                const n = noteFor(t.peer_id);
                return (
                  <button
                    key={t.conversation_id}
                    type="button"
                    onClick={() => openThread(t.conversation_id)}
                    className="relative flex w-16 shrink-0 flex-col items-center gap-1"
                  >
                    <Avatar className={cn("h-14 w-14", t.unread > 0 && "ring-2 ring-sky-400")}>
                      <AvatarImage src={t.peer_avatar ?? undefined} />
                      <AvatarFallback>{t.peer_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="w-full truncate text-center text-[10px] text-neutral-400">
                      {t.peer_name}
                    </span>
                    {n && (
                      <span className="absolute -top-1 left-1/2 z-10 max-w-[72px] -translate-x-1/2 truncate rounded-full bg-white px-1.5 py-0.5 text-[9px] font-medium text-black shadow">
                        {n.body}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div
          className={cn(
            "mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col overflow-hidden",
            mobileChat ? "px-0 pt-0" : "px-2 pt-2 sm:px-4",
          )}
        >
          {!mobileChat && (
            <>
              <div className="mb-2 shrink-0">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search conversations…"
                    className="h-10 rounded-xl border-white/10 bg-white/[0.05] pl-9"
                  />
                </div>
              </div>
              <div className="mb-2 flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => setTab("inbox")}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold",
                    tab === "inbox" ? "bg-sky-500 text-white" : "bg-white/5 text-neutral-400",
                  )}
                >
                  Inbox
                </button>
                <button
                  type="button"
                  onClick={() => setTab("requests")}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold",
                    tab === "requests" ? "bg-sky-500 text-white" : "bg-white/5 text-neutral-400",
                  )}
                >
                  Requests{requests.length > 0 ? ` (${requests.length})` : ""}
                </button>
              </div>
            </>
          )}

          <div
            className={cn(
              "flex min-h-0 flex-1 overflow-hidden",
              mobileChat
                ? "rounded-none border-0 bg-[#0a0a0a]"
                : "rounded-2xl border border-white/10 bg-black/40 shadow-inner",
            )}
          >
            <aside
              className={cn(
                "flex h-full w-full min-h-0 flex-col border-r border-white/10 md:w-[320px] md:shrink-0",
                mobileChat && "hidden md:flex",
              )}
            >
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
                {loading && <p className="p-6 text-center text-sm text-neutral-500">Loading…</p>}
                {!loading && filteredList.length === 0 && (
                  <p className="p-6 text-center text-sm text-neutral-500">
                    {query
                      ? "No chats match."
                      : tab === "requests"
                        ? "No requests."
                        : "No conversations yet."}
                  </p>
                )}
                {filteredList.map((t) => (
                  <button
                    key={t.conversation_id}
                    type="button"
                    onClick={() => openThread(t.conversation_id)}
                    className={cn(
                      "flex w-full items-center gap-3 border-b border-white/5 px-3 py-3 text-left hover:bg-white/[0.04]",
                      activeId === t.conversation_id && "bg-white/[0.06]",
                    )}
                  >
                    <Avatar className="h-11 w-11">
                      <AvatarImage src={t.peer_avatar ?? undefined} />
                      <AvatarFallback>{t.peer_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="flex min-w-0 items-center gap-1 truncate text-sm font-medium text-neutral-100">
                          <span className="truncate">{t.peer_name}</span>
                          {t.peer_verified && (
                            <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-sky-400" />
                          )}
                        </p>
                        {t.unread > 0 && (
                          <span className="shrink-0 rounded-full bg-sky-500 px-1.5 text-[10px] font-semibold text-white">
                            {t.unread}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-neutral-500">
                        {t.last_body?.startsWith("__voice__:")
                          ? "🎤 Voice message"
                          : t.last_body || "Start chatting"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </aside>

            <section
              className={cn(
                "flex min-h-0 flex-1 flex-col bg-[#0a0a0a]",
                !mobileChat && "hidden md:flex",
                mobileChat &&
                  "fixed inset-0 z-[100] flex w-full animate-in slide-in-from-right duration-200 md:static md:z-auto md:h-auto md:max-h-none md:animate-none",
              )}
              style={
                mobileChat
                  ? {
                      height: kbInset > 0 ? `calc(100dvh - ${kbInset}px)` : "100dvh",
                      maxHeight: kbInset > 0 ? `calc(100dvh - ${kbInset}px)` : "100dvh",
                      transition: "height 0.12s ease-out",
                    }
                  : undefined
              }
            >
              {!activeThread ? (
                <div className="grid flex-1 place-items-center text-sm text-neutral-500">
                  Select a conversation
                </div>
              ) : (
                <>
                  <div className="flex shrink-0 items-center gap-0.5 border-b border-white/8 bg-[#0a0a0a] px-1.5 py-2 pt-[max(0.5rem,env(safe-area-inset-top,0px))] md:px-2 md:pt-2.5">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-10 w-10 shrink-0 rounded-full"
                      aria-label="Back"
                      onClick={closeChat}
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <Link
                      to="/members/$id"
                      params={{ id: activeThread.peer_id }}
                      className="flex min-w-0 flex-1 items-center gap-2"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={activeThread.peer_avatar ?? undefined} />
                        <AvatarFallback>
                          {activeThread.peer_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-neutral-100">
                          {activeThread.peer_name}
                        </p>
                        <p className="text-[10px] text-neutral-500">
                          {activeThread.is_group
                            ? "Group"
                            : activeThread.status === "request"
                              ? "Message request"
                              : "Active"}
                        </p>
                      </div>
                    </Link>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-10 w-10 shrink-0 rounded-full"
                          aria-label="Chat options"
                        >
                          <MoreVertical className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52 border-white/10 bg-[#1c1c1e] text-neutral-100">
                        {!activeThread.is_group && (
                          <DropdownMenuItem asChild>
                            <Link
                              to="/members/$id"
                              params={{ id: activeThread.peer_id }}
                              className="flex cursor-pointer items-center gap-2"
                            >
                              <UserIcon className="h-4 w-4" /> View profile
                            </Link>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => {
                            toast.message("Scroll to find older messages in this chat");
                          }}
                        >
                          <Search className="mr-2 h-4 w-4" /> Search in chat
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-white/10" />
                        <DropdownMenuItem
                          className="text-rose-300 focus:text-rose-200"
                          onClick={() => {
                            closeChat();
                            toast.message("Chat closed");
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Close chat
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 py-3 [-webkit-overflow-scrolling:touch]">
                    {messages.map((m) => {
                      if (m.deleted_at) return null;
                      const mine = m.sender_id === user.id;
                      const isVoice = !!m.body?.startsWith("__voice__:") && !!m.image_url;
                      const vDur = voiceDurationSec(m.body);
                      return (
                        <div key={m.id} className={cn("group flex", mine ? "justify-end" : "justify-start")}>
                          <div className="relative max-w-[85%]">
                            {isVoice ? (
                              <div>
                                <VoiceBubble src={m.image_url!} durationSec={vDur} mine={mine} />
                                <span
                                  className={cn(
                                    "mt-0.5 block text-[10px] opacity-60",
                                    mine ? "text-right text-sky-100/80" : "text-neutral-400",
                                  )}
                                >
                                  {formatMsgTime(m.created_at)}
                                  {vDur != null ? ` · ${formatVoiceLen(vDur)}` : ""}
                                </span>
                              </div>
                            ) : (
                              <div
                                className={cn(
                                  "rounded-[18px] px-3 py-2 text-[15px]",
                                  mine ? "bg-[#0A84FF] text-white" : "bg-[#3A3B3C] text-neutral-50",
                                )}
                              >
                                {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                                {m.image_url && (
                                  <img
                                    src={m.image_url}
                                    alt=""
                                    className="mt-1 max-h-48 rounded-lg object-cover"
                                  />
                                )}
                                <span className="mt-1 block text-[10px] opacity-70">
                                  {formatMsgTime(m.created_at)}
                                </span>
                              </div>
                            )}
                            {mine && (
                              <button
                                type="button"
                                className="absolute -left-8 top-1 hidden rounded-full p-1 text-neutral-500 hover:bg-white/10 hover:text-rose-300 group-hover:block"
                                aria-label="Delete message"
                                onClick={() => void removeMessage(m.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={bottomRef} />
                  </div>

                  <div className="flex shrink-0 items-end gap-1.5 border-t border-white/8 bg-[#0a0a0a]/95 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]">
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
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="mb-0.5 h-9 w-9 shrink-0 rounded-full text-[#0A84FF]"
                      disabled={busy || recording}
                      onClick={() => photoInputRef.current?.click()}
                    >
                      <ImagePlus className="h-5 w-5" />
                    </Button>

                    {recording ? (
                      <div className="flex min-h-[40px] min-w-0 flex-1 items-center gap-2 rounded-[22px] border border-rose-500/40 bg-rose-500/10 px-3 py-1.5">
                        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500" />
                        <span className="text-sm font-medium text-rose-200">
                          Recording {formatVoiceLen(recordSecs)}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          className="ml-auto h-8 rounded-full bg-rose-500 px-3 text-white hover:bg-rose-400"
                          onClick={stopVoice}
                        >
                          <Square className="mr-1 h-3.5 w-3.5 fill-current" /> Stop
                        </Button>
                      </div>
                    ) : (
                      <div className="flex min-h-[40px] min-w-0 flex-1 items-center rounded-[22px] border border-white/10 bg-[#3A3B3C] px-3 py-1.5">
                        <Input
                          value={text}
                          onChange={(e) => setText(e.target.value)}
                          placeholder="Aa"
                          enterKeyHint="send"
                          autoComplete="off"
                          className="h-8 border-0 bg-transparent px-0 text-[15px] shadow-none focus-visible:ring-0"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              void send();
                            }
                          }}
                        />
                      </div>
                    )}

                    {!recording && text.trim() ? (
                      <Button
                        type="button"
                        size="icon"
                        disabled={busy}
                        onClick={() => void send()}
                        className="mb-0.5 h-9 w-9 shrink-0 rounded-full bg-[#0A84FF] text-white"
                      >
                        {busy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    ) : !recording ? (
                      <Button
                        type="button"
                        size="icon"
                        disabled={busy}
                        onClick={() => void startVoice()}
                        className="mb-0.5 h-9 w-9 shrink-0 rounded-full bg-[#0A84FF] text-white"
                        aria-label="Record voice message"
                      >
                        <Mic className="h-4 w-4" />
                      </Button>
                    ) : null}
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
