/**
 * Super Admin — Overview includes analytics; no separate Analytics tab.
 */
import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { PageShell } from "@/components/PageShell";
import {
  getPlatformStats,
  inviteOrganizer,
  isSuperAdminEmail,
  setOrganizerStatus,
  setOrganizerVerified,
  permanentlyRemoveOrganizer,
  PLATFORM_NAME,
  DEFAULT_ORGANIZER_SLUG,
} from "@/lib/organizers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Building2, Loader2, Shield, Trophy, Users, UserPlus, Ban, CheckCircle,
  LayoutDashboard, Activity, MessageSquare, RefreshCw, Search, Newspaper,
  Copy, BadgeCheck, Clock, MoreVertical, User, Home,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { MessagesInbox } from "@/components/MessagesInbox";
import { OrganizerRequestsPanel } from "@/components/platform/OrganizerRequestsPanel";
import { GaAnalyticsDashboard } from "@/components/platform/GaAnalyticsDashboard";
import { UserVerificationPanel } from "@/components/platform/UserVerificationPanel";
import { NewsAdminPanel } from "@/components/platform/NewsAdminPanel";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from "recharts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type Tab =
  | "overview"
  | "organizers"
  | "requests"
  | "invites"
  | "users"
  | "messages"
  | "news";

const TABS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "organizers", label: "Organizers", icon: Building2 },
  { id: "requests", label: "Requests", icon: Shield },
  { id: "invites", label: "Invites", icon: UserPlus },
  { id: "users", label: "Users", icon: Users },
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "news", label: "News", icon: Newspaper },
];

const PIE_COLORS = ["#38bdf8", "#f59e0b", "#f43f5e", "#a78bfa"];

export function SuperAdminPanelImpl() {
  const { user } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getPlatformStats>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);

  const reload = async () => {
    setLoading(true);
    try {
      const s = await getPlatformStats();
      setStats(s);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const filteredOrgs = useMemo(() => {
    const list = (stats?.organizersList ?? []).filter(
      (o) =>
        o.status !== "rejected" &&
        o.status !== "suspended" &&
        !String(o.name || "").startsWith("[removed]") &&
        !String(o.slug || "").includes("-gone-"),
    );
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (o) => o.name.toLowerCase().includes(q) || o.slug.toLowerCase().includes(q),
    );
  }, [stats, query]);

  const unread = stats?.messages ?? 0;

  const barData = useMemo(
    () => [
      { name: "Users", value: stats?.players ?? 0 },
      { name: "Orgs", value: stats?.organizers ?? 0 },
      { name: "Tourneys", value: stats?.tournaments ?? 0 },
      { name: "Live", value: stats?.liveTournaments ?? 0 },
      { name: "Done", value: stats?.completedTournaments ?? 0 },
    ],
    [stats],
  );

  const pieData = useMemo(() => {
    const b = stats?.byStatus;
    if (!b) return [];
    return [
      { name: "Active", value: b.active },
      { name: "Pending", value: b.pending },
      { name: "Suspended", value: b.suspended },
    ].filter((x) => x.value > 0);
  }, [stats]);

  if (loading && !stats) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-3 py-4 sm:px-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-lg font-bold text-white">Platform admin</h1>
        {unread > 0 && (
          <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">
            {unread} unread
          </span>
        )}
        {user && (
          <Button asChild size="sm" variant="secondary" className="ml-auto gap-1.5">
            <Link to="/members/$id" params={{ id: user.id }}>
              <User className="h-3.5 w-3.5" />
              Switch to profile
            </Link>
          </Button>
        )}
        <Button asChild size="sm" variant="outline" className="border-white/15 gap-1.5">
          <Link to="/">
            <Home className="h-3.5 w-3.5" />
            Home
          </Link>
        </Button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                active
                  ? "border-sky-400/40 bg-sky-500/15 text-sky-100"
                  : "border-white/10 bg-white/[0.03] text-neutral-400 hover:border-white/20",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
              {t.id === "messages" && unread > 0 && (
                <span className="ml-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "Users", value: stats?.players ?? 0 },
              { label: "Organizers", value: stats?.organizers ?? 0 },
              { label: "Tournaments", value: stats?.tournaments ?? 0 },
              { label: "Live", value: stats?.liveTournaments ?? 0 },
            ].map((c) => (
              <div key={c.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-[10px] uppercase text-neutral-500">{c.label}</p>
                <p className="text-xl font-bold tabular-nums text-white">{c.value}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="h-56 rounded-2xl border border-white/10 bg-white/[0.02] p-3">
              <p className="mb-2 text-xs font-semibold text-neutral-400">Platform volume</p>
              <ResponsiveContainer width="100%" height="85%">
                <BarChart data={barData}>
                  <XAxis dataKey="name" tick={{ fill: "#a3a3a3", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#a3a3a3", fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#38bdf8" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="h-56 rounded-2xl border border-white/10 bg-white/[0.02] p-3">
              <p className="mb-2 text-xs font-semibold text-neutral-400">Organizer status</p>
              <ResponsiveContainer width="100%" height="85%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={70} label>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <GaAnalyticsDashboard />
        </div>
      )}

      {tab === "organizers" && (
        <div className="space-y-3">
          <Input
            placeholder="Search organizers…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-white/10 bg-white/[0.04]"
          />
          <div className="overflow-hidden rounded-2xl border border-white/10">
            {filteredOrgs.map((o) => (
              <div
                key={o.id}
                className="flex flex-col gap-2 border-b border-white/5 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={o.logo_url ?? undefined} />
                    <AvatarFallback>{o.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="font-medium">{o.name}</p>
                      {o.is_verified && <BadgeCheck className="h-4 w-4 text-sky-400" />}
                      <Badge variant="secondary" className="text-[10px] uppercase">{o.status}</Badge>
                      {o.slug === DEFAULT_ORGANIZER_SLUG && (
                        <Badge className="bg-amber-500/20 text-[10px] text-amber-200">#1</Badge>
                      )}
                    </div>
                    <p className="text-xs text-neutral-500">@{o.slug}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {o.status !== "active" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/15"
                      onClick={async () => {
                        await setOrganizerStatus(o.id, "active");
                        toast.success("Activated");
                        void reload();
                      }}
                    >
                      <CheckCircle className="mr-1 h-3.5 w-3.5" /> Activate
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/15"
                    onClick={async () => {
                      await setOrganizerVerified(o.id, !o.is_verified);
                      toast.success(o.is_verified ? "Unverified" : "Verified");
                      void reload();
                    }}
                  >
                    <BadgeCheck className="mr-1 h-3.5 w-3.5" /> {o.is_verified ? "Unverify" : "Verify"}
                  </Button>
                  {o.status === "active" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-rose-300"
                      onClick={async () => {
                        await setOrganizerStatus(o.id, "suspended");
                        toast.success("Suspended");
                        void reload();
                      }}
                    >
                      <Ban className="mr-1 h-3.5 w-3.5" /> Suspend
                    </Button>
                  )}
                  {o.slug !== DEFAULT_ORGANIZER_SLUG && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-rose-400"
                      onClick={async () => {
                        if (
                          !window.confirm(
                            `Permanently delete organizer "${o.name}"? Public page, URL, and dashboard access will be removed forever.`,
                          )
                        )
                          return;
                        if (!window.confirm("This cannot be undone. Continue?")) return;
                        try {
                          const res = await permanentlyRemoveOrganizer(o.id, {
                            slug: o.slug,
                            name: o.name,
                          });
                          if (!res.ok) {
                            toast.error(res.error || "Delete failed");
                            return;
                          }
                          toast.success(
                            res.mode === "hard"
                              ? "Organizer permanently deleted"
                              : "Organizer removed — no longer public or on any dashboard",
                          );
                          void reload();
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Delete failed");
                        }
                      }}
                    >
                      Delete
                    </Button>
                  )}
                  <Button asChild size="sm" variant="secondary">
                    <Link to="/o/$slug" params={{ slug: o.slug }}>
                      Open
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await navigator.clipboard.writeText(`${window.location.origin}/o/${o.slug}`);
                      toast.success("Copied");
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            {!filteredOrgs.length && (
              <p className="p-6 text-sm text-neutral-500">No organizers match.</p>
            )}
          </div>
        </div>
      )}

      {tab === "requests" && <OrganizerRequestsPanel />}

      {tab === "invites" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Invite organizer">
            <div className="space-y-3">
              <Input placeholder="Organizer name" value={name} onChange={(e) => setName(e.target.value)} />
              <Input type="email" placeholder="Gmail" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Button
                className="w-full bg-neutral-100 text-black"
                disabled={busy}
                onClick={async () => {
                  if (!user) return;
                  setBusy(true);
                  const res = await inviteOrganizer({ email, name, invitedBy: user.id });
                  setBusy(false);
                  if (!res.ok) {
                    toast.error(res.error);
                    return;
                  }
                  setLastInviteLink(`${window.location.origin}/invite/${res.token}`);
                  toast.success("Invite created");
                  void reload();
                }}
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" /> Create invite
                  </>
                )}
              </Button>
              {lastInviteLink && <p className="break-all text-xs text-neutral-400">{lastInviteLink}</p>}
            </div>
          </Section>
          <Section title="Pending invites">
            <ul className="space-y-2">
              {(stats?.pendingInvites ?? []).map((inv) => (
                <li key={inv.id} className="rounded-xl border border-white/5 px-3 py-2.5 text-sm">
                  <p className="font-medium">{inv.email}</p>
                  <p className="text-[11px] text-neutral-500">
                    <Clock className="inline h-3 w-3" /> {new Date(inv.created_at).toLocaleString()}
                  </p>
                </li>
              ))}
              {!stats?.pendingInvites?.length && <p className="text-sm text-neutral-500">None</p>}
            </ul>
          </Section>
        </div>
      )}

      {tab === "users" && (
        <Section title="Users · Verify blue tick">
          <p className="mb-4 text-sm text-neutral-400">
            Search any member and grant or remove the verified badge.
          </p>
          <UserVerificationPanel />
        </Section>
      )}

      {tab === "messages" && (
        <Section title="Platform messages">
          <p className="mb-3 text-sm text-neutral-400">
            Direct user → platform admin messages (not organizer chats).
          </p>
          <Button
            variant="outline"
            className="border-white/15"
            onClick={() => router.navigate({ to: "/messages" })}
          >
            Open messages
          </Button>
        </Section>
      )}

      {tab === "news" && (
        <Section title="Upload / manage platform news">
          <p className="text-sm text-neutral-400">
            Use the News section on the public site or the content admin tools to publish platform-wide news.
          </p>
          <Button asChild className="mt-3" variant="secondary">
            <Link to="/news">Open news</Link>
          </Button>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <h2 className="mb-3 text-sm font-semibold text-white">{title}</h2>
      {children}
    </section>
  );
}
