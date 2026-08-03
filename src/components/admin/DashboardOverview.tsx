import { useState, type ReactNode, type ElementType } from "react";
import { Link } from "@tanstack/react-router";
import {
  Users, Trophy, Target, Swords, Flag, Activity,
  Crosshair, Plus, Megaphone, UserPlus, Settings, Radio, Loader2,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useDashboardStats, useTournamentScopedStats } from "./useDashboardStats";

const STATUS_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#06b6d4", "#f43f5e"];

function Card({
  icon: Icon, label, value, sub, color,
}: {
  icon: ElementType; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
        <div className={cn("rounded-xl p-2.5", color)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function Box({ title, children, className, action }: { title: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <div className={cn("glass rounded-2xl p-5", className)}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

const tooltipStyle = {
  background: "hsl(222 47% 8%)",
  border: "1px solid hsl(217 33% 20%)",
  borderRadius: 8,
} as const;

export function DashboardOverview() {
  const stats = useDashboardStats();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const scoped = useTournamentScopedStats(selectedId);
  const selected = stats.tournaments.find((t) => t.id === selectedId) ?? null;

  if (stats.loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Global stat cards — all live Supabase data */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card icon={Users} label="Members" value={stats.totalMembers} sub={`+${stats.newMembers7d} this week`} color="bg-blue-500/15 text-blue-400" />
        <Card icon={Trophy} label="Tournaments" value={stats.totalTournaments} sub={`${stats.liveTournaments} live now`} color="bg-emerald-500/15 text-emerald-400" />
        <Card icon={Swords} label="Matches" value={stats.totalMatches} sub={`${stats.playedMatches} played`} color="bg-violet-500/15 text-violet-400" />
        <Card icon={Flag} label="Reports" value={stats.pendingReports} sub="Pending review" color="bg-rose-500/15 text-rose-400" />
      </div>

      {/* Tournament selector (Section 4) */}
      <Box
        title="Tournament Analytics"
        action={
          <Select value={selectedId ?? ""} onValueChange={(v) => setSelectedId(v || null)}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Select a tournament" />
            </SelectTrigger>
            <SelectContent>
              {stats.tournaments.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      >
        {!selected ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Pick a tournament to see live player, match and goal analytics.
          </p>
        ) : scoped.isLoading || !scoped.data ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="capitalize bg-brand/20 text-brand-glow">{selected.status.replace(/_/g, " ")}</Badge>
              {selected.prize_pool && <Badge variant="outline">{selected.prize_pool}</Badge>}
              {selected.max_players && (
                <Badge variant="outline">{scoped.data.approved}/{selected.max_players} players</Badge>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Card icon={UserPlus} label="Players" value={scoped.data.approved} sub={`${scoped.data.pending} pending approval`} color="bg-blue-500/15 text-blue-400" />
              <Card icon={Swords} label="Matches" value={`${scoped.data.played}/${scoped.data.matches}`} sub="Played / total" color="bg-emerald-500/15 text-emerald-400" />
              <Card icon={Target} label="Goals" value={scoped.data.goals} sub="Total scored" color="bg-orange-500/15 text-orange-400" />
              <Card icon={Crosshair} label="Avg Goals" value={scoped.data.avgGoals} sub="Per match" color="bg-cyan-500/15 text-cyan-400" />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>Tournament completion</span>
                <span>{scoped.data.completion}%</span>
              </div>
              <Progress value={scoped.data.completion} className="h-2" />
            </div>
          </div>
        )}
      </Box>

      {/* Charts — member growth + tournament status */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Box title="Member Growth (14 days)" className="lg:col-span-3">
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.memberGrowth}>
                <defs>
                  <linearGradient id="gMembers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 17%)" />
                <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} fill="url(#gMembers)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Box>

        <Box title="Tournaments by Status" className="lg:col-span-2">
          {stats.statusSplit.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No tournaments yet.</p>
          ) : (
            <div className="flex items-center gap-4">
              <div className="h-40 w-40 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.statusSplit} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" stroke="none">
                      {stats.statusSplit.map((_, i) => (
                        <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-1.5 text-xs">
                {stats.statusSplit.map((s, i) => (
                  <li key={s.name} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: STATUS_COLORS[i % STATUS_COLORS.length] }} />
                    <span className="capitalize text-muted-foreground">{s.name}</span>
                    <span className="font-semibold">{s.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Box>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Box title="Player Registrations (14 days)">
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.registrations}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 17%)" />
                <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="count" stroke="#06b6d4" strokeWidth={2} fill="#06b6d433" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Box>
        <Box title="Goals per Matchday">
          {stats.goalsPerMatchday.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No played matches with matchdays yet.</p>
          ) : (
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.goalsPerMatchday}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 17%)" />
                  <XAxis dataKey="md" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="goals" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Box>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Box title="Quick Actions">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              { icon: Plus, label: "Create Tournament", t: "tournaments", c: "bg-blue-500/15 text-blue-400" },
              { icon: UserPlus, label: "Manage Players", t: "players", c: "bg-emerald-500/15 text-emerald-400" },
              { icon: Radio, label: "Tournament Manager", t: "tournaments", c: "bg-violet-500/15 text-violet-400" },
              { icon: Megaphone, label: "Announcement", t: "announcements", c: "bg-amber-500/15 text-amber-400" },
              { icon: Flag, label: "Reports", t: "reports", c: "bg-rose-500/15 text-rose-400" },
              { icon: Settings, label: "Site Settings", t: "settings", c: "bg-cyan-500/15 text-cyan-400" },
            ].map((a) => (
              <Link
                key={a.label}
                to="/dashboard"
                search={{ t: a.t }}
                className={cn("flex flex-col items-center gap-2 rounded-xl border border-white/5 p-4 text-center transition hover:scale-[1.02]", a.c)}
              >
                <a.icon className="h-5 w-5" />
                <span className="text-[11px] font-medium">{a.label}</span>
              </Link>
            ))}
          </div>
        </Box>

        <Box title="Recent Activity">
          {stats.activity.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No admin activity logged yet.</p>
          ) : (
            <ul className="space-y-2">
              {stats.activity.map((a) => (
                <li key={a.id} className="flex items-center gap-3 rounded-lg border border-white/5 px-3 py-2 text-sm">
                  <Activity className="h-4 w-4 shrink-0 text-brand-glow" />
                  <span className="flex-1 truncate">{a.action}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Box>
      </div>

      {stats.liveTournaments > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          <div>
            <p className="text-sm font-semibold text-emerald-300">
              {stats.liveTournaments} tournament{stats.liveTournaments > 1 ? "s" : ""} live
            </p>
            <p className="text-xs text-muted-foreground">
              {stats.tournaments.filter((t) => ["live", "ongoing", "check_in"].includes(t.status)).map((t) => t.name).join(" · ")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}