import { useEffect, useState, type ReactNode, type ElementType } from "react";
import {
  Users, Trophy, Target, TrendingUp, TrendingDown, Wallet, Award,
  BarChart3, Crosshair, Plus, UserPlus, Calendar, Megaphone, Flag, Download,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const revenueData = [
  { day: "D1", amount: 1000 }, { day: "D2", amount: 2200 },
  { day: "D3", amount: 2100 }, { day: "D4", amount: 2800 },
  { day: "D5", amount: 3500 }, { day: "D6", amount: 4200 },
  { day: "D7", amount: 4800 },
];
const regData = [
  { day: "D1", count: 5 }, { day: "D2", count: 14 }, { day: "D3", count: 16 },
  { day: "D4", count: 26 }, { day: "D5", count: 18 }, { day: "D6", count: 22 },
  { day: "D7", count: 36 },
];
const goalsData = [
  { md: "MD1", goals: 58 }, { md: "MD2", goals: 88 }, { md: "MD3", goals: 42 },
  { md: "MD4", goals: 68 }, { md: "MD5", goals: 45 }, { md: "MD6", goals: 52 },
  { md: "MD7", goals: 32 },
];

function Card({
  icon: Icon, label, value, sub, trend, up, color,
}: {
  icon: ElementType; label: string; value: string; sub?: string;
  trend?: string; up?: boolean; color: string;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/90 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-slate-400">{label}</p>
          <p className="mt-1 text-2xl font-bold text-white">{value}</p>
          {sub && <p className="text-xs text-slate-500">{sub}</p>}
        </div>
        <div className={cn("rounded-xl p-2.5", color)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {trend && (
        <p className={cn("mt-2 flex items-center gap-1 text-xs", up ? "text-emerald-400" : "text-rose-400")}>
          {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          {trend}
        </p>
      )}
    </div>
  );
}

function Box({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-white/5 bg-slate-900/70 p-5", className)}>
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-300">{title}</h3>
      {children}
    </div>
  );
}

export function DashboardOverview() {
  const [name, setName] = useState("eFootball League S1");
  const [players, setPlayers] = useState(24);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await supabase
          .from("tournaments")
          .select("name, participants_count")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (alive && data) {
          if (data.name) setName(data.name);
          if (typeof data.participants_count === "number") setPlayers(data.participants_count);
        }
      } catch { /* fallbacks */ }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  const collected = 4800;
  const prize = 2200;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card icon={Users} label="Players" value={`${players} / 32`} sub="Registered" trend="↑ 12%" up color="bg-blue-500/15 text-blue-400" />
        <Card icon={Trophy} label="Matches" value="96" sub="Total" trend="↑ 8%" up color="bg-emerald-500/15 text-emerald-400" />
        <Card icon={Target} label="Goals" value="278" sub="Total" trend="↑ 15%" up color="bg-orange-500/15 text-orange-400" />
        <Card icon={BarChart3} label="Reports" value="3" sub="Pending" trend="↓ 25%" color="bg-violet-500/15 text-violet-400" />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Box title="Tournament Revenue" className="lg:col-span-3">
          <p className="mb-3 text-3xl font-bold text-white">Rs. {collected.toLocaleString()}</p>
          <div className="mb-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <div><p className="text-[11px] text-slate-500">Fee</p><p className="font-semibold text-slate-200">Rs. 100</p></div>
            <div><p className="text-[11px] text-slate-500">Collected</p><p className="font-semibold text-slate-200">Rs. {collected}</p></div>
            <div><p className="text-[11px] text-slate-500">Players</p><p className="font-semibold text-slate-200">{players}/32</p></div>
            <div><p className="text-[11px] text-slate-500">Left</p><p className="font-semibold text-slate-200">{32 - players}</p></div>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} />
                <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} fill="url(#g1)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Box>

        <Box title="Status" className="lg:col-span-2">
          <div className="flex flex-col items-center">
            <div className="relative h-36 w-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={[{ v: 62 }, { v: 38 }]} cx="50%" cy="50%" innerRadius={45} outerRadius={60} startAngle={90} endAngle={-270} dataKey="v" stroke="none">
                    <Cell fill="#22c55e" /><Cell fill="#3b82f6" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 grid place-items-center text-center">
                <div><p className="text-2xl font-bold text-white">62%</p><p className="text-[10px] text-slate-400">Done</p></div>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-400">10 Aug 2026 – 30 Aug 2026</p>
          </div>
        </Box>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Box title="Player Registration">
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={regData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} />
                <Area type="monotone" dataKey="count" stroke="#06b6d4" strokeWidth={2} fill="#06b6d433" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Box>
        <Box title="Goals Per Matchday">
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={goalsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="md" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} />
                <Bar dataKey="goals" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Box>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card icon={Wallet} label="Collected" value={`Rs. ${collected}`} sub={`From ${players} players`} trend="↑ 18%" up color="bg-emerald-500/15 text-emerald-400" />
        <Card icon={Award} label="Prize Pool" value={`Rs. ${prize}`} sub="Total prize" color="bg-violet-500/15 text-violet-400" />
        <Card icon={BarChart3} label="Profit" value={`Rs. ${collected - prize}`} sub="Collected − Prize" trend="↑ 18%" up color="bg-amber-500/15 text-amber-400" />
        <Card icon={Crosshair} label="Avg Goals" value="2.89" sub="Per match" trend="↑ 12%" up color="bg-cyan-500/15 text-cyan-400" />
      </div>

      <Box title="Quick Actions">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { icon: Plus, label: "Create Tournament", c: "bg-blue-500/15 text-blue-400" },
            { icon: UserPlus, label: "Add Player", c: "bg-emerald-500/15 text-emerald-400" },
            { icon: Calendar, label: "Generate Fixtures", c: "bg-violet-500/15 text-violet-400" },
            { icon: Megaphone, label: "Announcement", c: "bg-amber-500/15 text-amber-400" },
            { icon: Flag, label: "End Tournament", c: "bg-rose-500/15 text-rose-400" },
            { icon: Download, label: "Export Data", c: "bg-cyan-500/15 text-cyan-400" },
          ].map((a) => (
            <button key={a.label} type="button" className={cn("flex flex-col items-center gap-2 rounded-xl border border-white/5 p-4 text-center", a.c)}>
              <a.icon className="h-5 w-5" />
              <span className="text-[11px] font-medium">{a.label}</span>
            </button>
          ))}
        </div>
      </Box>

      <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
        <div>
          <p className="text-sm font-semibold text-emerald-300">Current Tournament · LIVE</p>
          <p className="text-xs text-slate-400">{name} · {players} Players</p>
        </div>
      </div>
    </div>
  );
        }
