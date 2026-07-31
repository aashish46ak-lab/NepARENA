import { useEffect, useState, type ReactNode, type ElementType } from "react";
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
  Flag,
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

type Tournament = {
  id: string;
  name: string;
  status: string;
  prize_pool: string | null;
  participants_count: number;
  starts_at: string | null;
  ends_at: string | null;
};

type Match = {
  id: string;
  home_score: number | null;
  away_score: number | null;
  played: boolean;
  status: string;
  scheduled_at: string | null;
};

type Participant = {
  id: string;
  player_name: string;
  club: string | null;
  status: string;
  created_at: string;
};

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

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  trend,
  trendUp,
  accent = "blue",
}: {
  icon: ElementType;
  label: string;
  value: string;
  sub?: string;
  trend?: string;
  trendUp?: boolean;
  accent?: "blue" | "green" | "orange";
}) {
  const accents = {
    blue: "from-blue-500/20 to-blue-600/5 text-blue-400",
    green: "from-emerald-500/20 to-emerald-600/5 text-emerald-400",
    orange: "from-orange-500/20 to-orange-600/5 text-orange-400",
  };
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-slate-900/90 to-slate-950/90 p-5">
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-40", accents[accent])} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{label}</p>
          <p className="mt-1 text-2xl font-bold text-white">{value}</p>
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
  icon: ElementType;
  label: string;
  value: string;
  sub: string;
  trend?: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/80 p-4">
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
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-white/5 bg-slate-900/70 p-5", className)}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

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
            .select("id, name, status, prize_pool, participants_count, starts_at, ends_at")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("tournament_participants")
            .select("id, player_name, club, status, created_at")
            .order("created_at", { ascending: false })
            .limit(20),
          supabase
            .from("matches")
            .select("id, home_score, away_score, played, status, scheduled_at")
            .order("created_at", { ascending: false })
            .limit(8),
        ]);
        if (cancelled) return;
        if (tRes.data) setTournament(tRes.data as Tournament);
        if (pRes.data) setParticipants(pRes.data as Participant[]);
        if (mRes.data) setMatches(mRes.data as Match[]);
      } catch {
        // use fallbacks
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const approved = participants.filter((p) => p.status === "approved");
  const totalPlayers =
    tournament?.participants_count ?? (approved.length > 0 ? approved.length : 24);
  const maxPlayers = 32;
  const playedCount = matches.filter((m) => m.played).length;
  const totalMatches = playedCount > 0 ? playedCount : 96;
  const goalsSum = matches.reduce(
    (s, m) => s + (m.home_score ?? 0) + (m.away_score ?? 0),
    0,
  );
  const totalGoals = goalsSum > 0 ? goalsSum : 278;
  const completionPct = tournament?.status === "completed" ? 100 : 62;
  const collected = 4800;
  const prizePool = 2200;
  const profit = collected - prizePool;
  const avgGoals = (totalGoals / Math.max(totalMatches, 1)).toFixed(2);

  const recentPlayers = participants.slice(0, 4);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
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
        <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-slate-900/90 p-5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Reports</p>
          <p className="mt-1 text-2xl font-bold text-white">3</p>
          <p className="text-xs text-slate-500">Pending</p>
          <div className="mt-2 flex items-center gap-1 text-xs text-rose-400">
            <TrendingDown className="h-3.5 w-3.5" /> ↓ 25%
          </div>
        </div>
      </div>

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
          <p className="mb-1 text-3xl font-bold text-white">Rs. {collected.toLocaleString()}</p>
          <div className="mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <p className="text-[11px] text-slate-500">Registration Fee</p>
              <p className="font-semibold text-slate-200">Rs. 100</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500">Collected</p>
              <p className="font-semibold text-slate-200">Rs. {collected.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500">Players</p>
              <p className="font-semibold text-slate-200">
                {totalPlayers} / {maxPlayers}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500">Remaining</p>
              <p className="font-semibold text-slate-200">{maxPlayers - totalPlayers} slots</p>
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
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }} />
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
                    <Cell fill="#22c55e" />
                    <Cell fill="#3b82f6" />
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
            <div className="mt-4 grid w-full grid-cols-2 gap-3 text-center text-xs">
              <div className="rounded-xl bg-slate-800/60 p-2.5">
                <p className="text-slate-500">Start</p>
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
                <p className="text-slate-500">End</p>
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

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Player Registration">
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
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="count" stroke="#06b6d4" strokeWidth={2} fill="url(#regGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Goals Per Matchday">
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={goalsPerMatchday}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="md" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="goals" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

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
          sub="Collected − Prize"
          trend="↑ 18%"
          color="bg-amber-500/15 text-amber-400"
        />
        <MetricCard
          icon={Crosshair}
          label="Avg. Goals/Match"
          value={avgGoals}
          sub="Goals / Matches"
          trend="↑ 12%"
          color="bg-cyan-500/15 text-cyan-400"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="Recent Players">
          <div className="space-y-3">
            {(recentPlayers.length > 0
              ? recentPlayers
              : [
                  { player_name: "Sajan Magar", status: "approved", created_at: new Date().toISOString() },
                  { player_name: "Rohit Tamang", status: "approved", created_at: new Date().toISOString() },
                  { player_name: "Bikash Rai", status: "approved", created_at: new Date().toISOString() },
                  { player_name: "Aayush Gurung", status: "approved", created_at: new Date().toISOString() },
                ]
            ).map((p, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl bg-slate-800/50 px-3 py-2">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-700 text-xs font-bold text-slate-300">
                  {p.player_name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-slate-200">{p.player_name}</p>
                  <p className="text-[10px] text-slate-500">{new Date(p.created_at).toLocaleString()}</p>
                </div>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                  {p.status === "approved" ? "Approved" : "Pending"}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Pending Reports">
          <div className="space-y-3">
            {[
              { title: "Player Toxic Behavior", match: "Real Madrid vs Barca", time: "10 mins ago" },
              { title: "Match Disconnect", match: "Man United vs Arsenal", time: "25 mins ago" },
              { title: "Abuse Report", match: "Bayern vs PSG", time: "1 hour ago" },
            ].map((r, i) => (
              <div key={i} className="rounded-xl bg-slate-800/50 px-3 py-2.5">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-400">
                    New
                  </span>
                  <div>
                    <p className="text-xs font-medium text-slate-200">{r.title}</p>
                    <p className="text-[10px] text-slate-500">
                      {r.match} · {r.time}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Quick Actions">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { icon: Plus, label: "Create Tournament", color: "bg-blue-500/15 text-blue-400" },
            { icon: UserPlus, label: "Add Player", color: "bg-emerald-500/15 text-emerald-400" },
            { icon: Calendar, label: "Generate Fixtures", color: "bg-violet-500/15 text-violet-400" },
            { icon: Megaphone, label: "Post Announcement", color: "bg-amber-500/15 text-amber-400" },
            { icon: Flag, label: "End Tournament", color: "bg-rose-500/15 text-rose-400" },
            { icon: Download, label: "Export Data", color: "bg-cyan-500/15 text-cyan-400" },
          ].map((a) => (
            <button
              key={a.label}
              type="button"
              className={cn(
                "flex f
