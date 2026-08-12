/**
 * NepARENA Super Admin implementation
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
  Clock,
  Settings2,
  BadgePercent,
} from "lucide-react";
import { toast } from "sonner";
import { MessagesInbox } from "@/components/MessagesInbox";
import { OrganizerRequestsPanel } from "@/components/platform/OrganizerRequestsPanel";

type Tab = "overview" | "organizers" | "requests" | "invites" | "users" | "messages";

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
      (o) => o.name.toLowerCase().includes(q) || o.slug.toLowerCase().includes(q),
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
          <Link to="/" className="mt-6 inline-block text-neutral-200 underline">Back home</Link>
        </div>
      </PageShell>
    );
  }

  const maxBar = Math.max(stats?.players ?? 1, stats?.tournaments ?? 1, stats?.organizers ?? 1, stats?.liveTournaments ?? 1, 1);
  const tabs: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "requests", label: "Org requests", icon: UserPlus },
    { id: "messages", label: "Messages", icon: MessageSquare },
    { id: "organizers", label: "Organizers", icon: Building2 },
    { id: "invites", label: "Invites", icon: UserPlus },
    { id: "users", label: "Users", icon: Users },
  ];
  const verifyRate =
    (stats?.organizers ?? 0) > 0
      ? Math.round(((stats?.byStatus.verified ?? 0) / Math.max(stats?.organizers ?? 1, 1)) * 100)
      : 0;

  return (
    <PageShell force="platform">
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="relative mx-auto max-w-6xl px-4 py-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-4">
              <img src="/neparena-logo.png" alt="" className="h-14 w-14 rounded-2xl object-contain bg-black ring-1 ring-white/15" />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Super Admin</h1>
                  <Badge className="bg-sky-500/20 text-sky-300 hover:bg-sky-500/20">
                    <Shield className="mr-1 h-3 w-3" /> Platform
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-neutral-400">
                  {PLATFORM_NAME} · <span className="text-neutral-200">{user.email}</span>
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="border-white/15" disabled={refreshing} onClick={() => void reload()}>
                <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh
              </Button>
              <Button asChild size="sm" variant="outline" className="border-white/15">
                <Link to="/dashboard"><Settings2 className="mr-1.5 h-3.5 w-3.5" /> Organizer dashboards</Link>
              </Button>
              <Button asChild size="sm" className="bg-neutral-100 text-black hover:bg-white">
                <Link to="/">Public site <ExternalLink className="ml-1.5 h-3.5 w-3.5" /></Link>
              </Button>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-5">
            <MetricCard icon={Users} label="Registered users" value={stats?.players ?? "—"} />
            <MetricCard icon={Building2} label="Organizers" value={stats?.organizers ?? "—"} />
            <MetricCard icon={Trophy} label="Tournaments" value={stats?.tournaments ?? "—"} />
            <MetricCard icon={Activity} label="Live now" value={stats?.liveTournaments ?? "—"} />
            <MetricCard icon={MessageSquare} label="Unread msgs" value={stats?.messages ?? "—"} />
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
                tab === t.id ? "bg-neutral-100 text-black" : "text-neutral-400 hover:bg-white/5 hover:text-neutral-200"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
              {t.id === "messages" && (stats?.messages ?? 0) > 0 && (
                <span className="ml-1 rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">
                  {(stats?.messages ?? 0) > 99 ? "99+" : stats?.messages}
                </span>
              )}
              {t.id === "invites" && (stats?.pendingInvites?.length ?? 0) > 0 && (
                <span className="ml-1 rounded-full bg-rose-500/90 px-1.5 text-[10px] font-semibold text-white">
                  {stats?.pendingInvites?.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="mt-8 grid gap-6 lg:grid-cols-5">
            <div className="space-y-4 lg:col-span-3">
              <Section title="Platform analytics">
                <div className="space-y-3">
                  <Bar label="Users" value={stats?.players ?? 0} max={maxBar} />
                  <Bar label="Tournaments" value={stats?.tournaments ?? 0} max={maxBar} />
                  <Bar label="Organizers" value={stats?.organizers ?? 0} max={maxBar} />
                  <Bar label="Live" value={stats?.liveTournaments ?? 0} max={maxBar} />
                </div>
                <p className="mt-4 text-xs text-neutral-500">Verification rate: {verifyRate}%</p>
              </Section>
            </div>
            <div className="space-y-4 lg:col-span-2">
              <Section title="Quick links">
                <div className="grid gap-2">
                  <QuickLink to="/dashboard" label="Organizer dashboard" />
                  <QuickLink to="/organizers" label="Organizers" />
                  <QuickLink to="/users" label="Users" />
                  <button type="button" onClick={() => setTab("requests")} className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 px-3 py-2.5 text-left text-sm text-neutral-300 hover:bg-white/[0.04]">
                    Review applications <BadgePercent className="h-3.5 w-3.5" />
                  </button>
                </div>
              </Section>
            </div>
          </div>
        )}

        {tab === "messages" && (
          <div className="mt-8">
            <MessagesInbox mode="platform" onUnreadChange={() => void reload()} />
          </div>
        )}

        {tab === "requests" && <OrganizerRequestsPanel />}

        {tab === "organizers" && (
          <div className="mt-8 space-y-4">
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
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
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
                  const link = `${window.location.origin}/invite/${res.token}`;
                  setLastInviteLink(link);
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
          <div className="mt-8">
            <Section title="Latest users">
              <div className="overflow-hidden rounded-2xl border border-white/10">
                {(stats?.recentUsers ?? []).map((u) => (
                  <Link key={u.id} to="/members/$id" params={{ id: u.id }} className="flex items-center gap-3 border-b border-white/5 px-4 py-3 last:border-0 hover:bg-white/[0.03]">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{u.full_name || u.username || "User"}</p>
                      <p className="text-xs text-neutral-500">joined {new Date(u.created_at).toLocaleDateString()}</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-neutral-600" />
                  </Link>
                ))}
              </div>
            </Section>
          </div>
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

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.min(100, Math.round((value / Math.max(max, 1)) * 100));
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-neutral-500">
        <span>{label}</span>
        <span className="tabular-nums text-neutral-200">{value.toLocaleString()}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full bg-gradient-to-r from-neutral-400 to-white" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function QuickLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 px-3 py-2.5 text-sm text-neutral-300 hover:bg-white/[0.04]">
      {label}
      <ExternalLink className="h-3.5 w-3.5 text-neutral-600" />
    </Link>
  );
}
