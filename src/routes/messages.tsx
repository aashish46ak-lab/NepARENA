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

  // truncated body will be fixed - THIS IS EMERGENCY incomplete
  return (
    <PageShell force="platform" hideChrome>
      <div className="min-h-screen bg-[#0a0a0a]">
        <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0a0a0a]/95 backdrop-blur-md">
          <div className="mx-auto flex h-12 max-w-5xl items-center px-3">
            <h1 className="text-[15px] font-semibold text-white">Messages</h1>
            <button type="button" onClick={() => setSearchOpen((v) => !v)} className="ml-auto grid h-9 w-9 place-items-center rounded-full text-neutral-400 hover:bg-white/5" aria-label="Search">
              <Search className="h-5 w-5" />
            </button>
          </div>
        </header>
        <div className="p-8 text-center text-neutral-400">Loading messages…</div>
      </div>
    </PageShell>
  );
}
