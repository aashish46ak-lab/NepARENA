/**
 * NepARENA Super Admin — command center for platform owners.
 * aashish46ak@gmail.com + baralk851@gmail.com
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
  PLATFORM_NAME,
  DEFAULT_ORGANIZER_SLUG,
} from "@/lib/organizers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Loader2,
  Shield,
  Trophy,
  Users,
  UserPlus,
  Ban,
  CheckCircle,
  LayoutDashboard,
  Activity,
  MessageSquare,
  RefreshCw,
  Search,
  ExternalLink,
  Copy,
  BadgeCheck,
  Swords,
  Clock,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";
import { MessagesInbox } from "@/components/MessagesInbox";

type Tab = "overview" | "organizers" | "invites" | "users" | "messages";

export function SuperAdminPanel() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getPlatformStats>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const allowed = isSuperAdminEmail(user?.email);

  const reload = async () => {
    setRefreshing(true);
    try {
      setStats(await getPlatformStats());
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!loading && !user) router.navigate({ to: "/auth" });
  }, [loading, user, router]);

  useEffect(() => {
    if (allowed) void reload();
  }, [allowed]);

  const filteredOrgs = useMemo(() => {
    const list = stats?.organizersList ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.slug.toLowerCase().includes(q),
    );
  }, [stats, query]);

  if (loading || !user) {
    return (
      <PageShell force="platform">
        <div className="grid min-h-[70vh] place-items-center">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    );
  }

  if (!allowed) {
    return (
      <PageShell force="platform">
        <div className="mx-auto max-w-lg py-20 text-center px-4">
          <Shield className="mx-auto h-10 w-10 text-neutral-300" />
          <h1 className="mt-4 text-xl font-semibold">Super Admin only</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in with a platform owner account to open this panel.
          </p>
          <Link to="/" className="mt-6 inline-block text-neutral-200 underline">
            Back home
          </Link>
        </div>
      </PageShell>
    );
  }

  const maxBar = Math.max(
    stats?.players ?? 1,
    stats?.tournaments ?? 1,
    stats?.organizers ?? 1,
    stats?.matches ?? 1,
    1,
  );

  const tabs: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "messages", label: "Messages", icon: MessageSquare },
    { id: "organizers", label: "Organizers", icon: Building2 },
    { id: "invites", label: "Invites", icon: UserPlus },
    { id: "users", label: "Users", icon: Users },
  ];

  return (
    <PageShell force="platform">
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(212,212,212,0.12),_transparent_55%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-4">
              <img
                src="/neparena-logo.png"
                alt=""
                className="h-14 w-14 rounded-2xl object-contain bg-black ring-1 ring-white/15"
              />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Super Admin</h1>
                  <Badge className="bg-sky-500/20 text-sky-300 hover:bg-sky-500/20">
                    <Shield className="mr-1 h-3 w-3" />
                    Platform
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-neutral-400">
                  {PLATFORM_NAME} control center · signed in as{" "}
                  <span className="text-neutral-200">{user.email}</span>
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-white/15"
                disabled={refreshing}
                onClick={() => void reload()}
              >
                <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button asChild size="sm" variant="outline" className="border-white/15">
                <Link to="/dashboard">
                  <Settings2 className="mr-1.5 h-3.5 w-3.5" />
                  Organizer dashboards
                </Link>
              </Button>
              <Button asChild size="sm" className="bg-neutral-100 text-black hover:bg-white">
                <Link to="/">
                  Public site
                  <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6">
            <MetricCard icon={Users} label="Registered users" value={stats?.players ?? "—"} accent="from-sky-500/20" />
            <MetricCard icon={Building2} label="Organizers" value={stats?.organizers ?? "—"} accent="from-violet-500/20" />
            <MetricCard icon={Trophy} label="Tournaments" value={stats?.tournaments ?? "—"} accent="from-amber-500/20" />
            <MetricCard icon={Swords} label="Matches" value={stats?.matches ?? "—"} accent="from-emerald-500/20" />
            <MetricCard icon={Activity} label="Live now" value={stats?.liveTournaments ?? "—"} accent="from-rose-500/20" />
            <MetricCard icon={MessageSquare} label="Messages" value={stats?.messages ?? "—"} accent="from-neutral-500/20" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-wrap gap-2 border-b border-white/5 pb-3">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm transition ${
                tab === t.id
                  ? "bg-neutral-100 text-black"
                  : "text-neutral-400 hover:bg-white/5 hover:text-neutral-200"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
              {t.id === "invites" && (stats?.pendingInvites?.length ?? 0) > 0 && (
                <span className="ml-1 rounded-full bg-rose-500/90 px-1.5 text-[10px] font-semibold text-white">
                  {stats?.pendingInvites?.length}
                </span>
              )}
              {t.id === "messages" && (stats?.messages ?? 0) > 0 && (
                <span className="ml-1 rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">
                  {(stats?.messages ?? 0) > 99 ? "99+" : stats?.messages}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="mt-8 grid gap-6 lg:grid-cols-5">
            <div className="space-y-6 lg:col-span-3">
              <Section title="Platform health" desc="Aggregate metrics only — no organizer insider details">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <BigBar label="Users" value={stats?.players ?? 0} max={maxBar} color="from-sky-400 to-sky-600" />
                  <BigBar label="Tournaments" value={stats?.tournaments ?? 0} max={maxBar} color="from-amber-400 to-amber-600" />
                  <BigBar label="Matches" value={stats?.matches ?? 0} max={maxBar} color="from-emerald-400 to-emerald-600" />
                  <BigBar label="Organizers" value={stats?.organizers ?? 0} max={maxBar} color="from-violet-400 to-violet-600" />
                </div>
                <div className="mt-6 space-y-3">
                  <Bar label="Users" value={stats?.players ?? 0} max={maxBar} tone="sky" />
                  <Bar label="Tournaments" value={stats?.tournaments ?? 0} max={maxBar} tone="amber" />
                  <Bar label="Matches played" value={stats?.matches ?? 0} max={maxBar} tone="emerald" />
                  <Bar label="Organizers" value={stats?.organizers ?? 0} max={maxBar} tone="violet" />
                </div>
              </Section>
              <Section title="Organizer status" desc="Active, pending, verified, suspended">
                <StatusDonut
                  active={stats?.byStatus.active ?? 0}
                  pending={stats?.byStatus.pending ?? 0}
                  verified={stats?.byStatus.verified ?? 0}
                  suspended={stats?.byStatus.suspended ?? 0}
                />
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <MiniStat label="Active" value={stats?.byStatus.active ?? 0} color="text-emerald-400" />
                  <MiniStat label="Pending" value={stats?.byStatus.pending ?? 0} color="text-amber-400" />
                  <MiniStat label="Verified" value={stats?.byStatus.verified ?? 0} color="text-sky-400" />
                  <MiniStat label="Suspended" value={stats?.byStatus.suspended ?? 0} color="text-rose-400" />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <MiniStat label="Completed tournaments" value={stats?.completedTournaments ?? 0} />
                  <MiniStat label="Live / ongoing" value={stats?.liveTournaments ?? 0} />
                </div>
              </Section>
            </div>
            <div className="space-y-6 lg:col-span-2">
              <Section title="Quick actions">
                <div className="grid gap-2">
                  <QuickLink to="/dashboard" label="Default organizer dashboard" />
                  <QuickLink to="/organizers" label="Organizers directory" />
                  <QuickLink to="/users" label="Registered users" />
                  <QuickLink to="/ownership" label="Creators / ownership" />
                </div>
              </Section>
              <Section title="Recent signups">
                <ul className="space-y-2">
                  {(stats?.recentUsers ?? []).map((u) => (
                    <li key={u.id}>
                      <Link
                        to="/members/$id"
                        params={{ id: u.id }}
                        className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 hover:bg-white/[0.05]"
                      >
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="grid h-8 w-8 place-items-center rounded-full bg-neutral-800 text-[10px] font-semibold">
                            {(u.username ?? "?").slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{u.full_name || u.username || "User"}</p>
                          <p className="truncate text-[11px] text-neutral-500">{new Date(u.created_at).toLocaleDateString()}</p>
                        </div>
                      </Link>
                    </li>
                  ))}
                  {!stats?.recentUsers?.length && <p className="text-sm text-neutral-500">No users yet.</p>}
                </ul>
              </Section>
            </div>
          </div>
        )}

        {tab === "messages" && (
          <div className="mt-8">
            <MessagesInbox mode="platform" />
          </div>
        )}

        {tab === "organizers" && (
          <div className="mt-8 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">All organizers</h2>
                <p className="text-sm text-neutral-500">Activate, verify, suspend — no private internals exposed</p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                <Input className="pl-9" placeholder="Search name or slug…" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-white/10">
              {filteredOrgs.map((o) => (
                <div key={o.id} className="flex flex-col gap-3 border-b border-white/5 px-4 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    {o.logo_url ? (
                      <img src={o.logo_url} alt="" className="h-11 w-11 rounded-xl object-cover ring-1 ring-white/10" />
                    ) : (
                      <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-neutral-200 to-neutral-500 text-xs font-bold text-black">
                        {o.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="truncate font-medium">{o.name}</p>
                        {o.is_verified && <BadgeCheck className="h-4 w-4 text-sky-400" />}
                        <Badge variant="secondary" className="text-[10px] uppercase">{o.status}</Badge>
                        {o.slug === DEFAULT_ORGANIZER_SLUG && (
                          <Badge className="bg-amber-500/20 text-amber-200 text-[10px]">#1</Badge>
                        )}
                      </div>
                      <p className="truncate text-xs text-neutral-500">@{o.slug}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {o.status !== "active" && (
                      <Button size="sm" variant="outline" className="border-white/15" onClick={async () => { await setOrganizerStatus(o.id, "active"); toast.success("Activated"); void reload(); }}>
                        <CheckCircle className="mr-1 h-3.5 w-3.5" /> Activate
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="border-white/15" onClick={async () => { await setOrganizerVerified(o.id, !o.is_verified); toast.success(o.is_verified ? "Unverified" : "Verified"); void reload(); }}>
                      <BadgeCheck className="mr-1 h-3.5 w-3.5" /> {o.is_verified ? "Unverify" : "Verify"}
                    </Button>
                    {o.status === "active" && (
                      <Button size="sm" variant="ghost" className="text-rose-300 hover:text-rose-200" onClick={async () => { await setOrganizerStatus(o.id, "suspended"); toast.success("Suspended"); void reload(); }}>
                        <Ban className="mr-1 h-3.5 w-3.5" /> Suspend
                      </Button>
                    )}
                    <Button asChild size="sm" variant="secondary">
                      <Link to="/o/$slug" params={{ slug: o.slug }}>Open</Link>
                    </Button>
                    <Button size="sm" variant="ghost" onClick={async () => { await navigator.clipboard.writeText(`${window.location.origin}/o/${o.slug}`); toast.success("Link copied"); }}>
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

        {tab === "invites" && (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <Section title="Invite organizer" desc="New organizers get the same dashboard features (messages, themes, tournaments).">
              <div className="space-y-3">
                <Input placeholder="Organizer name" value={name} onChange={(e) => setName(e.target.value)} />
                <Input type="email" placeholder="Gmail to invite" value={email} onChange={(e) => setEmail(e.target.value)} />
                <Button className="w-full bg-neutral-100 text-black hover:bg-white" disabled={busy} onClick={async () => {
                  if (!user) return;
                  setBusy(true);
                  const res = await inviteOrganizer({ email, name, invitedBy: user.id });
                  setBusy(false);
                  if (!res.ok) { toast.error(res.error); return; }
                  const link = `${window.location.origin}/invite/${res.token}`;
                  setLastInviteLink(link);
                  toast.success("Invite created");
                  void reload();
                }}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (<><UserPlus className="mr-2 h-4 w-4" /> Create invite link</>)}
                </Button>
                {lastInviteLink && (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs">
                    <p className="mb-1 font-medium text-neutral-300">Share this link</p>
                    <p className="break-all text-neutral-400">{lastInviteLink}</p>
                    <Button size="sm" variant="outline" className="mt-2 border-white/15" onClick={async () => { await navigator.clipboard.writeText(lastInviteLink); toast.success("Copied"); }}>
                      <Copy className="mr-1 h-3.5 w-3.5" /> Copy
                    </Button>
                  </div>
                )}
              </div>
            </Section>
            <Section title="Pending invites" desc="Waiting to be accepted">
              <ul className="space-y-2">
                {(stats?.pendingInvites ?? []).map((inv) => (
                  <li key={inv.id} className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{inv.email}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-neutral-500">
                          <Clock className="h-3 w-3" /> {new Date(inv.created_at).toLocaleString()}
                        </p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={async () => {
                        await navigator.clipboard.writeText(`${window.location.origin}/invite/${inv.token}`);
                        toast.success("Invite link copied");
                      }}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </li>
                ))}
                {!stats?.pendingInvites?.length && <p className="text-sm text-neutral-500">No pending invites.</p>}
              </ul>
            </Section>
          </div>
        )}

        {tab === "users" && (
          <div className="mt-8">
            <Section title="Latest registered users" desc="Platform-wide signups">
              <div className="overflow-hidden rounded-2xl border border-white/10">
                {(stats?.recentUsers ?? []).map((u) => (
                  <Link key={u.id} to="/members/$id" params={{ id: u.id }} className="flex items-center gap-3 border-b border-white/5 px-4 py-3 last:border-0 hover:bg-white/[0.03]">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-neutral-800 text-xs font-semibold">
                        {(u.username ?? "?").slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{u.full_name || u.username || "User"}</p>
                      <p className="truncate text-xs text-neutral-500">@{u.username ?? "user"} · joined {new Date(u.created_at).toLocaleDateString()}</p>
                    </div>
                    <ExternalLink className="h-4 w-4 shrink-0 text-neutral-600" />
                  </Link>
                ))}
              </div>
              <div className="mt-4">
                <Button asChild variant="outline" className="border-white/15">
                  <Link to="/users">View all users</Link>
                </Button>
              </div>
            </Section>
          </div>
        )}
      </div>
    </PageShell>
  );
}

function MetricCard({ icon: Icon, label, value, accent = "from-white/10" }: { icon: typeof Users; label: string; value: string | number; accent?: string }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-gradient-to-br ${accent} to-transparent p-4`}>
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-black/40 text-neutral-200 ring-1 ring-white/10">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[11px] text-neutral-400">{label}</p>
          <p className="text-xl font-bold tabular-nums tracking-tight">{value}</p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <h3 className="font-semibold text-neutral-100">{title}</h3>
      {desc && <p className="mt-1 text-xs text-neutral-500">{desc}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function MiniStat({ label, value, color = "text-neutral-100" }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/20 p-3">
      <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
      <p className="text-[11px] text-neutral-500">{label}</p>
    </div>
  );
}

function Bar({
  label,
  value,
  max,
  tone = "neutral",
}: {
  label: string;
  value: number;
  max: number;
  tone?: "sky" | "amber" | "emerald" | "violet" | "neutral";
}) {
  const pct = Math.min(100, Math.round((value / Math.max(max, 1)) * 100));
  const gradients: Record<string, string> = {
    sky: "from-sky-500 to-sky-300",
    amber: "from-amber-500 to-amber-300",
    emerald: "from-emerald-500 to-emerald-300",
    violet: "from-violet-500 to-violet-300",
    neutral: "from-neutral-400 to-neutral-100",
  };
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-xs text-neutral-500">
        <span>{label}</span>
        <span className="tabular-nums font-medium text-neutral-200">{value.toLocaleString()}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.06] ring-1 ring-white/5">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${gradients[tone]} shadow-[0_0_12px_rgba(255,255,255,0.15)] transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function BigBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = Math.max(8, Math.min(100, Math.round((value / Math.max(max, 1)) * 100)));
  return (
    <div className="flex flex-col items-center rounded-2xl border border-white/10 bg-black/30 p-3">
      <div className="relative flex h-28 w-full items-end justify-center">
        <div className="absolute inset-x-3 bottom-0 top-0 rounded-lg bg-white/[0.03]" />
        <div
          className={`relative w-10 rounded-t-lg bg-gradient-to-t ${color} shadow-lg transition-all duration-700`}
          style={{ height: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-lg font-bold tabular-nums text-neutral-100">{value.toLocaleString()}</p>
      <p className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</p>
    </div>
  );
}

function StatusDonut({
  active,
  pending,
  verified,
  suspended,
}: {
  active: number;
  pending: number;
  verified: number;
  suspended: number;
}) {
  const total = Math.max(active + pending + suspended, 1);
  const segs = [
    { v: active, c: "#34d399", label: "Active" },
    { v: pending, c: "#fbbf24", label: "Pending" },
    { v: suspended, c: "#f87171", label: "Suspended" },
  ];
  let acc = 0;
  const stops: string[] = [];
  for (const s of segs) {
    const start = (acc / total) * 100;
    acc += s.v;
    const end = (acc / total) * 100;
    stops.push(`${s.c} ${start}% ${end}%`);
  }
  const bg = `conic-gradient(${stops.join(", ")})`;
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-8">
      <div className="relative h-36 w-36 shrink-0">
        <div
          className="h-full w-full rounded-full shadow-[0_0_40px_rgba(52,211,153,0.15)]"
          style={{ background: bg }}
        />
        <div className="absolute inset-4 grid place-items-center rounded-full bg-[#0a0a0a] ring-1 ring-white/10">
          <div className="text-center">
            <p className="text-2xl font-bold tabular-nums text-neutral-50">{total}</p>
            <p className="text-[10px] uppercase tracking-wider text-neutral-500">Orgs</p>
          </div>
        </div>
      </div>
      <ul className="w-full space-y-2 text-sm">
        {segs.map((s) => (
          <li key={s.label} className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-neutral-300">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.c }} />
              {s.label}
            </span>
            <span className="tabular-nums font-medium text-neutral-100">{s.v}</span>
          </li>
        ))}
        <li className="flex items-center justify-between gap-3 border-t border-white/5 pt-2">
          <span className="inline-flex items-center gap-2 text-neutral-300">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
            Verified
          </span>
          <span className="tabular-nums font-medium text-sky-300">{verified}</span>
        </li>
      </ul>
    </div>
  );
}

function QuickLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 px-3 py-2.5 text-sm text-neutral-300 transition hover:border-white/15 hover:bg-white/[0.04] hover:text-neutral-100"
    >
      {label}
      <ExternalLink className="h-3.5 w-3.5 text-neutral-600" />
    </Link>
  );
}
