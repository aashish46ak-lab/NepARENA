/**
 * Super Admin — clean shell, tabs (Analytics under options), 3-dot menu.
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
  Building2, Loader2, Shield, Trophy, Users, UserPlus, Ban, CheckCircle,
  LayoutDashboard, Activity, MessageSquare, RefreshCw, Search, ExternalLink,
  Copy, BadgeCheck, Clock, MoreVertical, User, Home, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { MessagesInbox } from "@/components/MessagesInbox";
import { OrganizerRequestsPanel } from "@/components/platform/OrganizerRequestsPanel";
import { GaAnalyticsDashboard } from "@/components/platform/GaAnalyticsDashboard";
import { UserVerificationPanel } from "@/components/platform/UserVerificationPanel";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from "recharts";

type Tab = "overview" | "messages" | "analytics" | "requests" | "organizers" | "invites" | "users";
const PIE_COLORS = ["#38bdf8", "#a78bfa", "#f472b6", "#34d399", "#fbbf24"];

export function SuperAdminPanelImpl() {
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
  const [unreadOverride, setUnreadOverride] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const allowed = isSuperAdminEmail(user?.email);

  const reload = async () => {
    setRefreshing(true);
    try {
      const s = await getPlatformStats();
      setStats(s);
      setUnreadOverride(null);
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
      (o) => o.name.toLowerCase().includes(q) || o.slug.toLowerCase().includes(q),
    );
  }, [stats, query]);

  const unread = unreadOverride ?? stats?.messages ?? 0;

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
      { name: "Verified", value: b.verified },
    ].filter((d) => d.value > 0);
  }, [stats]);

  const registrationTrend = useMemo(() => {
    const users = stats?.recentUsers ?? [];
    const days: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days[d.toISOString().slice(0, 10)] = 0;
    }
    for (const u of users) {
      const key = (u.created_at || "").slice(0, 10);
      if (key in days) days[key] += 1;
    }
    return Object.entries(days).map(([date, count]) => ({ date: date.slice(5), signups: count }));
  }, [stats]);

  if (loading || !user) {
    return (
      <PageShell force="platform" hideChrome>
        <div className="grid min-h-[70vh] place-items-center">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    );
  }

  if (!allowed) {
    return (
      <PageShell force="platform" hideChrome>
        <div className="mx-auto max-w-lg py-20 text-center px-4">
          <Shield className="mx-auto h-10 w-10 text-neutral-300" />
          <h1 className="mt-4 text-xl font-semibold">Super Admin only</h1>
          <Link to="/" className="mt-6 inline-block text-neutral-200 underline">Back home</Link>
        </div>
      </PageShell>
    );
  }

  const tabs: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "messages", label: "Messages", icon: MessageSquare },
    { id: "analytics", label: "Analytics", icon: TrendingUp },
    { id: "requests", label: "Org requests", icon: UserPlus },
    { id: "organizers", label: "Organizers", icon: Building2 },
    { id: "invites", label: "Invites", icon: UserPlus },
    { id: "users", label: "Users", icon: Users },
  ];

  return (
    <PageShell force="platform" hideChrome>
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="/neparena-logo.png" alt="" className="h-11 w-11 rounded-xl object-contain bg-black ring-1 ring-white/15" />
            <div>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Super Admin</h1>
              <p className="text-xs text-neutral-400">{PLATFORM_NAME} control plane</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="border-white/15" disabled={refreshing} onClick={() => void reload()}>
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/[0.04] text-neutral-200 hover:bg-white/10"
                aria-label="Menu"
              >
                <MoreVertical className="h-5 w-5" />
              </button>
              {menuOpen && (
                <>
                  <button type="button" className="fixed inset-0 z-40" aria-label="Close" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-11 z-50 min-w-[210px] overflow-hidden rounded-2xl border border-white/12 bg-[#141416]/98 py-1.5 shadow-2xl backdrop-blur-xl">
                    <Link to="/" className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm text-neutral-100 hover:bg-white/8" onClick={() => setMenuOpen(false)}>
                      <Home className="h-4 w-4 text-neutral-400" /> Go to Home
                    </Link>
                    <Link to="/members/$id" params={{ id: user.id }} className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm text-neutral-100 hover:bg-white/8" onClick={() => setMenuOpen(false)}>
                      <User className="h-4 w-4 text-sky-400" /> Personal profile
                    </Link>
                    <Link to="/dashboard" className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm text-neutral-100 hover:bg-white/8" onClick={() => setMenuOpen(false)}>
                      <LayoutDashboard className="h-4 w-4 text-emerald-400" /> Organizer dashboard
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2 border-b border-white/8 pb-3">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm transition ${
                tab === t.id ? "bg-neutral-100 text-black" : "text-neutral-400 hover:bg-white/5 hover:text-neutral-200"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
              {t.id === "messages" && unread > 0 && (
                <span className="ml-1 rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <MetricCard icon={Users} label="Users" value={stats?.players ?? "—"} />
              <MetricCard icon={Building2} label="Organizers" value={stats?.organizers ?? "—"} />
              <MetricCard icon={Trophy} label="Tournaments" value={stats?.tournaments ?? "—"} />
              <MetricCard icon={Activity} label="Live" value={stats?.liveTournaments ?? "—"} />
            </div>

            <div className="grid gap-6 lg:grid-cols-5">
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 lg:col-span-3">
                <h3 className="mb-4 text-sm font-semibold text-neutral-100">Platform volume</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="name" tick={{ fill: "#a3a3a3", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#a3a3a3" fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} />
                      <Bar dataKey="value" fill="#38bdf8" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 lg:col-span-2">
                <h3 className="mb-4 text-sm font-semibold text-neutral-100">Organizer status</h3>
                <div className="h-64">
                  {pieData.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                          {pieData.map((_, i) => (<Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />))}
                        </Pie>
                        <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (<div className="grid h-full place-items-center text-sm text-neutral-500">No data</div>)}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <h3 className="mb-4 text-sm font-semibold text-neutral-100">Signups (7d)</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={registrationTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="date" tick={{ fill: "#a3a3a3", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#a3a3a3", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} />
                    <Area type="monotone" dataKey="signups" stroke="#a78bfa" fill="rgba(167,139,250,0.25)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {tab === "messages" && (
          <MessagesInbox mode="platform" onUnreadChange={(n) => { setUnreadOverride(n); if (n === 0) void reload(); }} />
        )}

        {tab === "analytics" && <GaAnalyticsDashboard />}

        {tab === "requests" && <OrganizerRequestsPanel />}

        {tab === "organizers" && (
          <div className="space-y-4">
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
              <Input className="pl-9" placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <div className="overflow-hidden rounded-2xl border border-white/10">
              {filteredOrgs.map((o) => (
                <div key={o.id} className="flex flex-col gap-3 border-b border-white/5 px-4 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="font-medium">{o.name}</p>
                      {o.is_verified && <BadgeCheck className="h-4 w-4 text-sky-400" />}
                      <Badge variant="secondary" className="text-[10px] uppercase">{o.status}</Badge>
                      {o.slug === DEFAULT_ORGANIZER_SLUG && <Badge className="bg-amber-500/20 text-amber-200 text-[10px]">#1</Badge>}
                    </div>
                    <p className="text-xs text-neutral-500">@{o.slug}</p>
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
                      <Button size="sm" variant="ghost" className="text-rose-300" onClick={async () => { await setOrganizerStatus(o.id, "suspended"); toast.success("Suspended"); void reload(); }}>
                        <Ban className="mr-1 h-3.5 w-3.5" /> Suspend
                      </Button>
                    )}
                    <Button asChild size="sm" variant="secondary"><Link to="/o/$slug" params={{ slug: o.slug }}>Open</Link></Button>
                    <Button size="sm" variant="ghost" onClick={async () => { await navigator.clipboard.writeText(`${window.location.origin}/o/${o.slug}`); toast.success("Copied"); }}><Copy className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ))}
              {!filteredOrgs.length && <p className="p-6 text-sm text-neutral-500">No organizers match.</p>}
            </div>
          </div>
        )}

        {tab === "invites" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="Invite organizer">
              <div className="space-y-3">
                <Input placeholder="Organizer name" value={name} onChange={(e) => setName(e.target.value)} />
                <Input type="email" placeholder="Gmail" value={email} onChange={(e) => setEmail(e.target.value)} />
                <Button className="w-full bg-neutral-100 text-black" disabled={busy} onClick={async () => {
                  if (!user) return;
                  setBusy(true);
                  const res = await inviteOrganizer({ email, name, invitedBy: user.id });
                  setBusy(false);
                  if (!res.ok) { toast.error(res.error); return; }
                  setLastInviteLink(`${window.location.origin}/invite/${res.token}`);
                  toast.success("Invite created");
                  void reload();
                }}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (<><UserPlus className="mr-2 h-4 w-4" /> Create invite</>)}
                </Button>
                {lastInviteLink && <p className="break-all text-xs text-neutral-400">{lastInviteLink}</p>}
              </div>
            </Section>
            <Section title="Pending invites">
              <ul className="space-y-2">
                {(stats?.pendingInvites ?? []).map((inv) => (
                  <li key={inv.id} className="rounded-xl border border-white/5 px-3 py-2.5 text-sm">
                    <p className="font-medium">{inv.email}</p>
                    <p className="text-[11px] text-neutral-500"><Clock className="inline h-3 w-3" /> {new Date(inv.created_at).toLocaleString()}</p>
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
      </div>
    </PageShell>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-black/40 ring-1 ring-white/10"><Icon className="h-4 w-4" /></div>
        <div>
          <p className="text-[11px] text-neutral-400">{label}</p>
          <p className="text-xl font-bold tabular-nums">{value}</p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <h3 className="font-semibold text-neutral-100">{title}</h3>
      <div className="mt-4">{children}</div>
    </div>
  );
}
