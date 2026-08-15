import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase, type AppNotification } from "@/lib/supabase";
import { followUser, isFollowingUser } from "@/lib/user-follows";
import { notify } from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { subscribeWebPush } from "@/lib/web-push";

type NotifRow = AppNotification & {
  type?: string;
  actor_id?: string | null;
  meta?: Record<string, unknown> | null;
};

export function NotificationsBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<NotifRow[]>([]);
  const [mutualMap, setMutualMap] = useState<Record<string, boolean>>({});
  const [followingBack, setFollowingBack] = useState<Record<string, boolean>>({});

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(25);
    const rows = (data ?? []) as NotifRow[];
    setItems(rows);

    const actors = [
      ...new Set(
        rows
          .filter((n) => (n.type ?? "").toLowerCase() === "follow" && n.actor_id)
          .map((n) => n.actor_id as string),
      ),
    ];
    const fmap: Record<string, boolean> = {};
    const mmap: Record<string, boolean> = {};
    await Promise.all(
      actors.map(async (aid) => {
        const iFollow = await isFollowingUser(user.id, aid);
        const theyFollow = await isFollowingUser(aid, user.id);
        fmap[aid] = iFollow;
        mmap[aid] = iFollow && theyFollow;
      }),
    );
    setFollowingBack(fmap);
    setMutualMap(mmap);
  };

  useEffect(() => {
    void load();
    if (!user) return;
    const channel = supabase
      .channel("notif-" + user.id)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: "user_id=eq." + user.id,
        },
        (payload) => {
          void load();
          const row = payload.new as {
            title?: string;
            body?: string | null;
            link?: string | null;
          } | null;
          if (
            row?.title &&
            typeof Notification !== "undefined" &&
            Notification.permission === "granted"
          ) {
            try {
              const n = new Notification(row.title, {
                body: row.body ?? "",
                icon: "/pwa-192x192.png",
                badge: "/pwa-192x192-maskable.png",
                tag: "neparena-notif",
              });
              n.onclick = () => {
                window.focus();
                n.close();
                if (row.link) {
                  try {
                    const path = row.link.startsWith("http")
                      ? new URL(row.link).pathname + new URL(row.link).search
                      : row.link;
                    window.location.href = path;
                  } catch {
                    /* ignore */
                  }
                }
              };
            } catch {
              /* ignore */
            }
          }
        },
      )
      .subscribe();

    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      void Notification.requestPermission().then((p) => {
        if (p === "granted") void subscribeWebPush(user.id);
      });
    } else if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      void subscribeWebPush(user.id);
    }

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id]);

  if (!user) return null;

  const unread = items.filter((n) => !n.read_at).length;

  const openNotif = async (n: NotifRow) => {
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", n.id);
    setItems((prev) =>
      prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)),
    );
    const link = n.link;
    if (!link) return;
    try {
      const path = link.startsWith("http")
        ? new URL(link).pathname + new URL(link).search
        : link;
      // Deep-link: messages, feed post, profile, tournaments
      if (path.startsWith("/messages")) {
        const u = new URL(path, window.location.origin);
        void navigate({ to: "/messages", search: { c: u.searchParams.get("c") || undefined } as never });
        return;
      }
      if (path.startsWith("/feed")) {
        const u = new URL(path, window.location.origin);
        void navigate({ to: "/feed", search: { post: u.searchParams.get("post") || undefined } as never });
        return;
      }
      if (path.startsWith("/members/")) {
        const id = path.split("/").filter(Boolean)[1];
        if (id) { void navigate({ to: "/members/$id", params: { id } }); return; }
      }
      void navigate({ to: path as "/" });
    } catch {
      window.location.href = link;
    }
  };

  const markAll = async () => {
    if (!user || unread === 0) return;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);
    void load();
  };

  const followBack = async (actorId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || !actorId) return;
    await followUser(user.id, actorId);
    setFollowingBack((m) => ({ ...m, [actorId]: true }));
    setMutualMap((m) => ({ ...m, [actorId]: true }));
    await notify({
      userId: actorId,
      title: "followed you back",
      body: "You follow each other now",
      type: "follow",
      link: `/members/${user.id}`,
      actorId: user.id,
    });
    toast.success("Followed back");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-brand text-[10px] font-bold text-primary-foreground grid place-items-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuLabel className="flex items-center justify-between px-3 py-2.5">
          <span>Notifications</span>
          {unread > 0 && (
            <button
              type="button"
              className="text-xs text-brand-glow hover:underline"
              onClick={markAll}
            >
              Mark all read
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0" />
        {items.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            No notifications
          </div>
        ) : (
          <div className="max-h-[360px] overflow-y-auto">
            {items.map((n) => {
              const isFollow = (n.type ?? "").toLowerCase() === "follow";
              const actorId = n.actor_id ?? null;
              const mutual = actorId ? mutualMap[actorId] : false;
              const iFollow = actorId ? followingBack[actorId] : false;

              return (
                <DropdownMenuItem
                  key={n.id}
                  className="flex flex-col items-start gap-1 px-3 py-2.5 cursor-pointer"
                  onClick={() => void openNotif(n)}
                >
                  <div className="flex w-full items-center gap-2">
                    <span className="font-medium text-sm truncate flex-1">
                      {isFollow && mutual ? "You follow each other" : n.title}
                    </span>
                    {!n.read_at && (
                      <span className="h-2 w-2 rounded-full bg-brand shrink-0" />
                    )}
                  </div>
                  {n.body && !isFollow && (
                    <span className="text-xs text-muted-foreground line-clamp-2">{n.body}</span>
                  )}
                  {isFollow && actorId && !iFollow && (
                    <button
                      type="button"
                      onClick={(e) => void followBack(actorId, e)}
                      className="mt-1 rounded-full bg-sky-500 px-3 py-1 text-[11px] font-semibold text-white hover:bg-sky-400"
                    >
                      Follow Back
                    </button>
                  )}
                  {isFollow && mutual && (
                    <span className="text-[11px] text-emerald-400">You follow each other</span>
                  )}
                  {((n.type ?? "").toLowerCase() === "message" || (n.type ?? "").toLowerCase() === "dm") && n.link && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        void openNotif(n);
                      }}
                      className="mt-1 rounded-full bg-sky-500/90 px-3 py-1 text-[11px] font-semibold text-white hover:bg-sky-400"
                    >
                      Reply
                    </button>
                  )}
                </DropdownMenuItem>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
