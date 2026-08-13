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
  reactToDm,
  sendDmMessage,
  type DmMessage,
  type DmThread,
} from "@/lib/dm";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ArrowLeft, Loader2, Send, Smile } from "lucide-react";
import { toast } from "sonner";

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
  const { user, loading: authLoading } = useAuth();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/messages" });
  const [threads, setThreads] = useState<DmThread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(search.c ?? null);
  const [msgs, setMsgs] = useState<DmMessage[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileChat, setMobileChat] = useState(!!search.c || !!search.with);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const activeThread = useMemo(
    () => threads.find((t) => t.conversation_id === activeId) ?? null,
    [threads, activeId],
  );

  const reloadThreads = async () => {
    if (!user) return;
    const list = await listDmThreads(user.id);
    setThreads(list);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    void (async () => {
      setLoading(true);
      // Open/create chat with peer from ?with=
      if (search.with) {
        const cid = await getOrCreateDm(search.with);
        if (cid) {
          setActiveId(cid);
          setMobileChat(true);
        }
      }
      await reloadThreads();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, search.with]);

  useEffect(() => {
    if (!activeId || !user) return;
    void (async () => {
      const list = await listDmMessages(activeId);
      setMsgs(list);
      await markDmRead(activeId, user.id);
      void reloadThreads();
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
    })();

    const channel = supabase
      .channel("dm-" + activeId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dm_messages",
          filter: `conversation_id=eq.${activeId}`,
        },
        (payload) => {
          const row = payload.new as DmMessage;
          setMsgs((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
          void markDmRead(activeId, user.id);
          requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, user?.id]);

  const send = async () => {
    if (!user || !activeId || !text.trim() || busy) return;
    setBusy(true);
    const body = text.trim();
    setText("");
    const res = await sendDmMessage({
      conversationId: activeId,
      senderId: user.id,
      body,
    });
    setBusy(false);
    if (res.error) toast.error(res.error);
    else void reloadThreads();
  };

  const openThread = (cid: string) => {
    setActiveId(cid);
    setMobileChat(true);
    void navigate({ search: { c: cid } });
  };

  if (authLoading || loading) {
    return (
      <PageShell force="platform">
        <div className="grid min-h-[50vh] place-items-center">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell force="platform">
      <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-5xl flex-col px-2 py-3 sm:px-4">
        <div className="mb-2 flex items-center justify-between px-1">
          <h1 className="text-lg font-bold text-white">Messages</h1>
          <Button asChild variant="ghost" size="sm" className="text-neutral-400">
            <Link to="/">Home</Link>
          </Button>
        </div>

        {/* Chat heads */}
        {threads.length > 0 && (
          <div className="mb-3 flex gap-3 overflow-x-auto px-1 pb-1 scrollbar-none">
            {threads.slice(0, 16).map((t) => (
              <button
                key={t.conversation_id}
                type="button"
                onClick={() => openThread(t.conversation_id)}
                className="relative shrink-0 text-center"
              >
                <Avatar className="h-14 w-14 ring-2 ring-offset-2 ring-offset-[#0a0a0a] ring-white/10">
                  <AvatarImage src={t.peer_avatar ?? undefined} />
                  <AvatarFallback>{t.peer_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                {t.unread > 0 && (
                  <span className="absolute right-0 top-0 h-3 w-3 rounded-full bg-sky-400 ring-2 ring-[#0a0a0a]" />
                )}
                <p className="mt-1 max-w-[3.5rem] truncate text-[10px] text-neutral-400">
                  {t.peer_name.split(" ")[0]}
                </p>
              </button>
            ))}
          </div>
        )}

        <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
          {/* Thread list */}
          <aside
            className={cn(
              "w-full border-r border-white/10 md:w-[320px] md:shrink-0",
              mobileChat && "hidden md:block",
            )}
          >
            <div className="h-full overflow-y-auto">
              {threads.length === 0 && (
                <p className="p-6 text-center text-sm text-neutral-500">
                  No conversations yet. Open a profile and tap Message.
                </p>
              )}
              {threads.map((t) => (
                <button
                  key={t.conversation_id}
                  type="button"
                  onClick={() => openThread(t.conversation_id)}
                  className={cn(
                    "flex w-full items-center gap-3 border-b border-white/5 px-3 py-3 text-left transition hover:bg-white/[0.04]",
                    activeId === t.conversation_id && "bg-white/[0.06]",
                  )}
                >
                  <Avatar className="h-11 w-11">
                    <AvatarImage src={t.peer_avatar ?? undefined} />
                    <AvatarFallback>{t.peer_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-white">{t.peer_name}</p>
                      <span className="shrink-0 text-[10px] text-neutral-500">
                        {formatMsgTime(t.last_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs text-neutral-500">{t.last_body || "Photo"}</p>
                      {t.unread > 0 && (
                        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-sky-500 px-1 text-[10px] font-bold text-white">
                          {t.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          {/* Conversation */}
          <section
            className={cn(
              "flex min-w-0 flex-1 flex-col",
              !mobileChat && "hidden md:flex",
            )}
          >
            {!activeThread ? (
              <div className="grid flex-1 place-items-center text-sm text-neutral-500">
                Select a conversation
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="md:hidden"
                    onClick={() => {
                      setMobileChat(false);
                      void navigate({ search: {} });
                    }}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Link
                    to="/members/$id"
                    params={{ id: activeThread.peer_id }}
                    className="flex min-w-0 items-center gap-2"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={activeThread.peer_avatar ?? undefined} />
                      <AvatarFallback>
                        {activeThread.peer_name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {activeThread.peer_name}
                      </p>
                      <p className="text-[10px] text-neutral-500">NepARENA chat</p>
                    </div>
                  </Link>
                </div>

                <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
                  {msgs.map((m) => {
                    const mine = m.sender_id === user?.id;
                    return (
                      <div
                        key={m.id}
                        className={cn("flex", mine ? "justify-end" : "justify-start")}
                      >
                        <div
                          className={cn(
                            "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                            mine
                              ? "rounded-br-md bg-sky-600 text-white"
                              : "rounded-bl-md bg-white/10 text-neutral-100",
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
                          <div className="mt-1 flex items-center justify-between gap-2">
                            <span className="text-[10px] opacity-70">
                              {formatMsgTime(m.created_at)}
                            </span>
                            <div className="flex gap-0.5">
                              {REACTIONS.map((r) => (
                                <button
                                  key={r}
                                  type="button"
                                  className="text-[11px] opacity-60 hover:opacity-100"
                                  onClick={() => void reactToDm(m.id, m.reaction === r ? null : r)}
                                >
                                  {r}
                                </button>
                              ))}
                            </div>
                          </div>
                          {m.reaction && (
                            <span className="mt-0.5 inline-block rounded-full bg-black/30 px-1.5 text-xs">
                              {m.reaction}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>

                <div className="flex items-center gap-2 border-t border-white/10 p-2">
                  <Button type="button" size="icon" variant="ghost" className="shrink-0">
                    <Smile className="h-4 w-4 text-neutral-400" />
                  </Button>
                  <Input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Message…"
                    className="border-white/10 bg-white/5"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void send();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="icon"
                    disabled={busy || !text.trim()}
                    onClick={() => void send()}
                    className="shrink-0 bg-sky-500 text-white hover:bg-sky-400"
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </PageShell>
  );
}
