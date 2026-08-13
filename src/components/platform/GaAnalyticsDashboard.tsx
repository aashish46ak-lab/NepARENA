import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Globe2,
  Loader2,
  Monitor,
  RefreshCw,
  Smartphone,
  Tablet,
  Users,
  Eye,
  Clock,
  Percent,
  AlertTriangle,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import type { DateRangeKey, GaOverview, GaRealtime } from "@/lib/ga-types";

const PIE = ["#38bdf8", "#a78bfa", "#f472b6", "#34d399", "#fbbf24", "#fb923c", "#94a3b8"];

const RANGES: { id: DateRangeKey; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7 Days" },
  { id: "30d", label: "30 Days" },
  { id: "90d", label: "90 Days" },
  { id: "1y", label: "1 Year" },
];

export function GaAnalyticsDashboard() {
  const { session } = useAuth();
  const [range, setRange] = useState<DateRangeKey>("30d");
  const [overview, setOverview] = useState<GaOverview | null>(null);
  const [realtime, setRealtime] = useState<GaRealtime | null>(null);
  const [loading, setLoading] = useState(true);
  const [rtLoading, setRtLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configured, setConfigured] = useState(true);

  const token = session?.access_token;

  const loadOverview = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analytics?kind=overview&range=${range}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.status === 403) {
        setError("Forbidden — Owner only");
        return;
      }
      if (json.configured === false) {
        setConfigured(false);
        setOverview(null);
        return;
      }
      if (json.error) {
        setError(json.error);
        return;
      }
      setConfigured(true);
      setOverview(json.data as GaOverview);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [token, range]);

  const loadRealtime = useCallback(async () => {
    if (!token || !configured) return;
    setRtLoading(true);
    try {
      const res = await fetch(`/api/analytics?kind=realtime`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.configured === false) {
        setConfigured(false);
        return;
      }
      if (json.data) setRealtime(json.data as GaRealtime);
    } catch {
      /* soft fail realtime */
    } finally {
      setRtLoading(false);
    }
  }, [token, configured]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    void loadRealtime();
    const id = window.setInterval(() => void loadRealtime(), 15_000);
    return () => window.clearInterval(id);
  }, [loadRealtime]);

  if (!configured) {
    return (
      <div className="mt-8 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-400" />
          <div className="space-y-2 text-sm text-neutral-300">
            <p className="font-semibold text-amber-200">GA4 Data API not configured</p>
            <p>
              Client tracking is active with measurement ID{" "}
              <code className="text-sky-300">G-72Q6FDC8T9</code>. To power this dashboard with live
              GA4 reports, add server env vars:
            </p>
            <ul className="list-inside list-disc space-y-1 text-neutral-400">
              <li>
                <code>GA4_PROPERTY_ID</code> — numeric Property ID from GA Admin
              </li>
              <li>
                <code>GA4_SERVICE_ACCOUNT_JSON</code> — service account key JSON
              </li>
              <li>
                Or <code>GA4_SERVICE_ACCOUNT_EMAIL</code> +{" "}
                <code>GA4_SERVICE_ACCOUNT_PRIVATE_KEY</code>
              </li>
            </ul>
            <p className="text-neutral-500">
              Grant the service account <strong className="text-neutral-300">Viewer</strong> on the
              GA4 property. Install <code>google-auth-library</code> on the server.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const t = overview?.totals;

  return (
    <div className="mt-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                range === r.id
                  ? "bg-neutral-100 text-black"
                  : "bg-white/5 text-neutral-400 hover:bg-white/10"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="border-white/15"
          disabled={loading}
          onClick={() => void loadOverview()}
        >
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/40 to-black p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-emerald-200">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </span>
            Live right now
          </h3>
          <span className="text-[11px] text-neutral-500">
            {rtLoading
              ? "Updating…"
              : realtime?.fetchedAt
                ? `Updated ${new Date(realtime.fetchedAt).toLocaleTimeString()}`
                : "—"}
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <LiveStat label="Active users" value={realtime?.activeUsers ?? "—"} />
          <LiveList
            label="Countries"
            items={(realtime?.byCountry ?? []).slice(0, 4).map((c) => `${c.name} (${c.users})`)}
          />
          <LiveList
            label="Devices"
            items={(realtime?.byDevice ?? []).map((d) => `${d.name} (${d.users})`)}
          />
          <LiveList
            label="Active pages"
            items={(realtime?.byPage ?? []).slice(0, 4).map((p) => `${p.path} (${p.users})`)}
          />
        </div>
      </div>

      {loading && !overview ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-500" />
        </div>
      ) : overview ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-5">
            <Metric icon={Users} label="Total users" value={t?.totalUsers ?? 0} />
            <Metric icon={Users} label="New users" value={t?.newUsers ?? 0} />
            <Metric icon={Users} label="Returning" value={t?.returningUsers ?? 0} />
            <Metric icon={Activity} label="Active users" value={t?.activeUsers ?? 0} />
            <Metric icon={Eye} label="Page views" value={t?.screenPageViews ?? 0} />
            <Metric icon={Activity} label="Sessions" value={t?.sessions ?? 0} />
            <Metric
              icon={Clock}
              label="Avg session"
              value={formatDuration(t?.averageSessionDuration ?? 0)}
            />
            <Metric
              icon={Percent}
              label="Bounce rate"
              value={`${((t?.bounceRate ?? 0) * 100).toFixed(1)}%`}
            />
            <Metric
              icon={Percent}
              label="Engagement"
              value={`${((t?.engagementRate ?? 0) * 100).toFixed(1)}%`}
            />
            <Metric icon={Globe2} label="Countries" value={overview.countries.length} />
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            <ChartCard title="Daily visitors" className="lg:col-span-3">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={overview.daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#a3a3a3", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: string) => (v.length > 5 ? v.slice(5) : v)}
                  />
                  <YAxis tick={{ fill: "#a3a3a3", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area
                    type="monotone"
                    dataKey="users"
                    stroke="#38bdf8"
                    fill="rgba(56,189,248,0.2)"
                    name="Users"
                  />
                  <Area
                    type="monotone"
                    dataKey="views"
                    stroke="#a78bfa"
                    fill="rgba(167,139,250,0.12)"
                    name="Views"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Devices" className="lg:col-span-2">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={overview.devices}
                    dataKey="users"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={90}
                  >
                    {overview.devices.map((_, i) => (
                      <Cell key={i} fill={PIE[i % PIE.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 flex justify-center gap-4 text-[11px] text-neutral-500">
                <span className="inline-flex items-center gap-1">
                  <Monitor className="h-3 w-3" /> Desktop
                </span>
                <span className="inline-flex items-center gap-1">
                  <Smartphone className="h-3 w-3" /> Mobile
                </span>
                <span className="inline-flex items-center gap-1">
                  <Tablet className="h-3 w-3" /> Tablet
                </span>
              </div>
            </ChartCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Traffic sources">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={overview.sources.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#a3a3a3", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis tick={{ fill: "#a3a3a3", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="users" fill="#34d399" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Channel groups">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={overview.channelGroups}
                    dataKey="users"
                    nameKey="name"
                    outerRadius={90}
                  >
                    {overview.channelGroups.map((_, i) => (
                      <Cell key={i} fill={PIE[i % PIE.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Top countries">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={overview.countries.slice(0, 8)} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis type="number" tick={{ fill: "#a3a3a3", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={90}
                    tick={{ fill: "#a3a3a3", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="users" fill="#fbbf24" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Browsers">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={overview.browsers.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#a3a3a3", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis tick={{ fill: "#a3a3a3", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="users" fill="#a78bfa" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <RankList
              title="Most viewed pages"
              rows={overview.pages.map((p) => ({
                label: p.path,
                value: `${p.views} views · ${p.users} users`,
              }))}
            />
            <RankList
              title="Top landing pages"
              rows={overview.landingPages.map((p) => ({
                label: p.path,
                value: `${p.sessions} sessions`,
              }))}
            />
            <RankList
              title="Cities"
              rows={overview.cities.map((c) => ({
                label: c.name,
                value: `${c.users} users`,
              }))}
            />
            <RankList
              title="Operating systems"
              rows={overview.os.map((o) => ({
                label: o.name,
                value: `${o.users} users`,
              }))}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}

const tooltipStyle = {
  background: "#0a0a0a",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 12,
};

function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return "0s";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m <= 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-black/40 ring-1 ring-white/10">
          <Icon className="h-4 w-4 text-sky-400" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-neutral-400">{label}</p>
          <p className="truncate text-lg font-bold tabular-nums">{value}</p>
        </div>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.02] p-5 ${className}`}>
      <h3 className="mb-4 text-sm font-semibold text-neutral-100">{title}</h3>
      {children}
    </div>
  );
}

function RankList({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: string }[];
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <h3 className="mb-3 text-sm font-semibold text-neutral-100">{title}</h3>
      <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">
        {rows.length === 0 && <li className="text-neutral-500">No data yet</li>}
        {rows.map((r, i) => (
          <li
            key={`${r.label}-${i}`}
            className="flex items-center justify-between gap-2 rounded-lg border border-white/5 px-3 py-2"
          >
            <span className="truncate text-neutral-200">{r.label}</span>
            <span className="shrink-0 text-[11px] text-neutral-500">{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LiveStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-3">
      <p className="text-[11px] text-neutral-500">{label}</p>
      <p className="text-2xl font-bold tabular-nums text-emerald-300">{value}</p>
    </div>
  );
}

function LiveList({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-3">
      <p className="mb-1 text-[11px] text-neutral-500">{label}</p>
      <ul className="space-y-0.5 text-xs text-neutral-300">
        {items.length === 0 && <li className="text-neutral-600">—</li>}
        {items.map((x) => (
          <li key={x} className="truncate">{x}</li>
        ))}
      </ul>
    </div>
  );
}
