/**
 * Messages — Instagram-style horizontal chat heads + notes (24h), inbox/requests, in-chat search.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteMyNote,
  getFriendNotes,
  getMyNote,
  listThreads,
  setMyNote,
  type DmThread,
  type UserNote,
} from "@/lib/dm";
import { PageShell } from "@/components/PageShell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { PLATFORM_NAME } from "@/lib/organizers";
import { cn } from "@/lib/utils";
import { Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { DmThreadView } from "@/components/DmThreadView";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/messages")({
  component: MessagesPage,
});

function MessagesPage() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mobileChat, setMobileChat] = useState(false);
  const [tab, setTab] = useState<"inbox" | "requests">("inbox");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [myNote, setMyNoteState] = useState<UserNote | null>(null);
  const [friendNotes, setFriendNotes] = useState<UserNote[]>([]);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);

  const { data: threads = [], isLoading } = useQuery({
    queryKey: ["dm_threads", user?.id],
    enabled: !!user?.id,
    queryFn: () => listThreads(user!.id),
    refetchInterval: 30_000,
  });

  const inbox = useMemo(() => threads.filter((t) => t.status === "active"), [threads]);
  const requests = useMemo(() => threads.filter((t) => t.status === "request"), [threads]);
  const chatHeads = useMemo(() => inbox.filter((t) => t.status === "active").slice(0, 16), [inbox]);

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

  const openThread = useCallback((id: string) => {
    setActiveId(id);
    setMobileChat(true);
  }, []);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      setMyNoteState(await getMyNote(user.id));
      const peers = threads.map((t) => t.peer_id).filter(Boolean);
      if (peers.length) setFriendNotes(await getFriendNotes(peers));
    })();
  }, [user, threads]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("dm-inbox")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dm_messages" },
        () => {
          void qc.invalidateQueries({ queryKey: ["dm_threads", user.id] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, qc]);

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
                {isLoading && <p className="p-6 text-center text-sm text-neutral-500">Loading…</p>}
                {!isLoading && filteredList.length === 0 && (
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
                        <p className="truncate text-xs text-neutral-500">{t.last_message || "Start chatting"}</p>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            </aside>

            <main className={cn("flex min-h-0 flex-1 flex-col", !mobileChat && "hidden md:flex")}>
              {activeThread ? (
                <>
                  <div className="flex items-center gap-3 border-b border-white/10 px-3 py-2">
                    <button type="button" className="md:hidden text-neutral-400" onClick={() => setMobileChat(false)}>←</button>
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={activeThread.peer_avatar ?? undefined} />
                      <AvatarFallback>{activeThread.peer_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-neutral-100">{activeThread.peer_name}</p>
                      <p className="text-[10px] text-neutral-500">{activeThread.status === "request" ? "Message request" : "NepARENA chat"}</p>
                    </div>
                  </div>
                  <DmThreadView conversationId={activeThread.conversation_id} peerId={activeThread.peer_id} peerName={activeThread.peer_name} status={activeThread.status} onBack={() => setMobileChat(false)} />
                </>
              ) : (
                <div className="grid flex-1 place-items-center text-sm text-neutral-500">Select a conversation</div>
              )}
            </main>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
