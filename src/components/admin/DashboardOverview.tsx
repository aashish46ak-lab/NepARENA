import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Users,
  Trophy,
  Target,
  TrendingUp,
  TrendingDown,
  Wallet,
  Award,
  BarChart3,
  Crosshair,
  Plus,
  UserPlus,
  Calendar,
  Megaphone,
  Flag as FlagIcon,
  Download,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

/* ───────── Types ───────── */
type Tournament = {
  id: string;
  name: string;
  status: string;
  registration_open: boolean;
  prize_pool: string | null;
  participants_count: number;
  starts_at: string | null;
  ends_at: string | null;
  banner_url: string | null;
};

type Match = {
  id: string;
  home_score: number | null;
  away_score: number | null;
  played: boolean;
  status: string;
  scheduled_at: string | null;
  home?: { player_name: string; club: string | null } | null;
  away?: { player_name: string; club: string | null } | null;
};

type Participant = {
  id: string;
  player_name: string;
  club: string | null;
  status: string;
  created_at: string;
  photo_url: string | null;
};

/* ───────── Fallback chart data ───────── */
const revenueData = [
  { day: "Day 1", amount: 1000 },
  { day: "Day 2", amount: 2200 },
  { day: "Day 3", amount: 2100 },
  { day: "Day 4", amount: 2800 },
  { day: "Day 5", amount: 3500 },
  { day: "Day 6", amount: 4200 },
  { day: "Day 7", amount: 4800 },
];

const registrationData = [
  { day: "Day 1", count: 5 },
  { day: "Day 2", count: 14 },
  { day: "Day 3", count: 16 },
  { day: "Day 4", count: 26 },
  { day: "Day 5", count: 18 },
  { day: "Day 6", count: 22 },
  { day: "Day 7", count: 36 },
];

const goalsPerMatchday = [
  { md: "MD1", goals: 58 },
  { md: "MD2", goals: 88 },
  { md: "MD3", goals: 42 },
  { md: "MD4", goals: 68 },
  { md: "MD5", goals: 45 },
  { md: "MD6", goals: 52 },
  { md: "MD7", goals: 32 },
];

const STATUS_COLORS = {
  completed: "#22c55e",
  remaining: "#3b82f6",
};

/* ───────── Small UI helpers ───────── */
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  trend,
  trendUp,
  accent = "blue",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  trend?: string;
  trendUp?: boolean;
  accent?: "blue" | "green" | "orange" | "purple" | "cyan";
}) {
  const accents = {
    blue: "from-blue-500/20 to-blue-600/5 text-blue-400",
    green: "from-emerald-500/20 to-emerald-600/5 text-emerald-400",
    orange: "from-orange-500/20 to-orange-600/5 text-orange-400",
    purple: "from-violet-500/20 to-violet-600/5 text-violet-400",
    cyan: "from-cyan-500/20 to-cyan-600/5 text-cyan-400",
  };
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-slate-900/90 to-slate-950/90 p-5 backdrop-blur">
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-40", accents[accent])} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-white">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
        </div>
        <div className={cn("rounded-xl bg-gradient-to-br p-2.5", accents[accent])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {trend && (
        <div className="relative mt-3 flex items-center gap-1 text-xs">
          {trendUp ? (
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-rose-400" />
          )}
          <span className={trendUp ? "text-emerald-400" : "text-rose-400"}>{trend}</span>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  trend,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  trend?: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/80 p-4 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className={cn("rounded-xl p-2.5", color)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{label}</p>
          <p className="truncate text-lg font-bold text-white">{value}</p>
          <p className="text-xs text-slate-500">
            {sub}
            {trend && <span className="ml-1 text-emerald-400">{trend}</span>}
          </p>
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-white/5 bg-slate-900/70 p-5 backdrop-blur", className)}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ───────── Main Component ───────── */
export function DashboardOverview() {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [tRes, pRes, mRes] = await Promise.all([
          supabase
            .from("tournaments")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("tournament_participants")
            .select("id, player_name, club, status, created_at, photo_url")
            .order("created_at", { ascending: false })
            .limit(20),
          supabase
            .from("matches")
            .select(
              `id, home_score, away_score, played, status, scheduled_at,
               home:tournament_participants!matches_home_id_fkey(player_name, club),
               away:tournament_participants!matches_away_id_fkey(player_name, club)`,
            )
            .order("scheduled_at", { ascending: false })
            .limit(8),
        ]);

        if (cancelled) return;
        if (tRes.data) setTournament(tRes.data as Tournament);
        if (pRes.data) setParticipants(pRes.data as Participant[]);
        if (mRes.data) setMatches(mRes.data as unknown as Match[]);
      } catch {
        /* keep fallbacks */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const approved = participants.filter((p) => p.status === "approved");
  const pendingReports = 3;
  const totalPlayers = tournament?.participants_count ?? approved.length || 24;
  const maxPlayers = 32;
  const totalMatches = matches.filter((m) => m.played).length || 96;
  const totalGoals =
    matches.reduce((s, m) => s + (m.home_score ?? 0) + (m.away_score ?? 0), 0) || 278;
  const completionPct = tournament?.status === "completed" ? 100 : 62;
  const collected = 4800;
  const prizePool = 2200;
  const profit = collected - prizePool;
  const avgGoals = totalMatches > 0 ? (totalGoals / Math.max(totalMatches, 1)).toFixed(2) : "2.89";

  const liveMatches = matches.filter((m) => !m.played).slice(0, 3);
  const recentResults = matches.filter((m) => m.played).slice(0, 4);
  const recentPlayers = participants.slice(0, 4);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Top Stats ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Players"
          value={`${totalPlayers} / ${maxPlayers}`}
          sub="Registered"
          trend="↑ 12%"
          trendUp
          accent="blue"
        />
        <StatCard
          icon={Trophy}
          label="Matches"
          value={String(totalMatches)}
          sub="Total Matches"
          trend="↑ 8%"
          trendUp
          accent="green"
        />
        <StatCard
          icon={Target}
          label="Goals"
          value={String(totalGoals)}
          sub="Total Goals"
          trend="↑ 15%"
          trendUp
          accent="orange"
        />
        <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-slate-900/90 to-slate-950/90 p-5">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/15 to-transparent opacity-50" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Reports</p>
              <p className="mt-1 text-2xl font-bold text-white">{pendingReports}</p>
              <p className="text-xs text-slate-500">Pending</p>
              <div className="mt-2 flex items-center gap-1 text-xs text-rose-400">
                <TrendingDown className="h-3.5 w-3.5" />
                ↓ 25%
              </div>
            </div>
            <div className="relative h-16 w-16">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#1e293b" strokeWidth="3" />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="3"
                  strokeDasharray={`${75 * 0.88} 88`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 grid place-items-center text-xs font-bold text-blue-400">
                75%
              </span>
            </div>
          </div>
          <p className="relative mt-1 text-[10px] text-slate-500">Completion</p>
        </div>
      </div>

      {/* ── Revenue + Status ── */}
      <div className="grid gap-4 lg:grid-cols-5">
        <SectionCard
          title="Tournament Revenue"
          className="lg:col-span-3"
          action={
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <TrendingUp className="h-3.5 w-3.5" /> ↑ 18% from last 7 days
            </span>
          }
        >
          <p className="mb-1 text-3xl font-bold tracking-tight text-white">
            Rs. {collected.toLocaleString()}
          </p>
          <div className="mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <p className="text-[11px] text-slate-500">Registration Fee</p>
              <p className="font-semibold text-slate-200">Rs. 100</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500">Collected Amount</p>
              <p className="font-semibold text-slate-200">Rs. {collected.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500">Players Registered</p>
              <p className="font-semibold text-slate-200">
                {totalPlayers} / {maxPlayers}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500">Remaining Slots</p>
              <p className="font-semibold text-slate-200">{maxPlayers - totalPlayers} Players</p>
            </div>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "#0f172a",
                    border: "1px solid #1e293b",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Tournament Status" className="lg:col-span-2">
          <div className="flex flex-col items-center">
            <div className="relative h-36 w-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Completed", value: completionPct },
                      { name: "Remaining", value: 100 - completionPct },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={60}
                    startAngle={90}
                    endAngle={-270}
                    dataKey="value"
                    stroke="none"
                  >
                    <Cell fill={STATUS_COLORS.completed} />
                    <Cell fill={STATUS_COLORS.remaining} />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 grid place-items-center">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{completionPct}%</p>
                  <p className="text-[10px] text-slate-400">Completed</p>
                </div>
              </div>
            </div>
            <div className="mt-2 flex gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Completed {completionPct}%
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Remaining {100 - completionPct}%
              </span>
            </div>
            <div className="mt-4 grid w-full grid-cols-2 gap-3 text-center text-xs">
              <div className="rounded-xl bg-slate-800/60 p-2.5">
                <p className="text-slate-500">Start Date</p>
                <p className="mt-0.5 font-semibold text-slate-200">
                  {tournament?.starts_at
                    ? new Date(tournament.starts_at).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "10 Aug 2026"}
                </p>
              </div>
              <div className="rounded-xl bg-slate-800/60 p-2.5">
                <p className="text-slate-500">End Date</p>
                <p className="mt-0.5 font-semibold text-slate-200">
                  {tournament?.ends_at
                    ? new Date(tournament.ends_at).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "30 Aug 2026"}
                </p>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* ── Charts Row ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Player Registration"
          action={<span className="text-xs text-slate-500">This Week ▾</span>}
        >
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={registrationData}>
                <defs>
                  <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "#0f172a",
                    border: "1px solid #1e293b",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="count" stroke="#06b6d4" strokeWidth={2} fill="url(#regGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard
          title="Goals Per Matchday"
          action={<span className="text-xs text-slate-500">All Matchdays ▾</span>}
        >
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={goalsPerMatchday}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="md" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "#0f172a",
                    border: "1px solid #1e293b",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="goals" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* ── Metric Cards ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          icon={Wallet}
          label="Collected Amount"
          value={`Rs. ${collected.toLocaleString()}`}
          sub={`From ${totalPlayers} Players`}
          trend="↑ 18%"
          color="bg-emerald-500/15 text-emerald-400"
        />
        <MetricCard
          icon={Award}
          label="Prize Pool"
          value={`Rs. ${prizePool.toLocaleString()}`}
          sub="Total Prize"
          color="bg-violet-500/15 text-violet-400"
        />
        <MetricCard
          icon={BarChart3}
          label="Profit"
          value={`Rs. ${profit.toLocaleString()}`}
          sub="Collected − Prize Pool"
          trend="↑ 18%"
          color="bg-amber-500/15 text-amber-400"
        />
        <MetricCard
          icon={Crosshair}
          label="Avg. Goals/Match"
          value={avgGoals}
          sub="Total Goals / Total Matches"
          trend="↑ 12%"
          color="bg-cyan-500/15 text-cyan-400"
        />
      </div>

      {/* ── Lists Row ── */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SectionCard title="Live Fixtures" action={<span className="text-xs text
