import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
Trophy, Calendar, Users, ShieldAlert, List, Table2, FileText,
Award, Loader2, ExternalLink, UserPlus, CheckCircle2, ChevronLeft,
ChevronRight,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { SmartImage } from "@/components/SmartImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from
"@/components/ui/avatar";
import {
Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
supabase,
type Tournament, type TournamentParticipant, type Match, type
Matchday,
} from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { sortStandings, type StandingRow } from
"@/components/tournament-manager/shared";
export const Route = createFileRoute("/tournaments/$id")({
head: () => ({
meta: [
{ title: "Tournament — eFootball Nepal" },
{ name: "description", content: "Tournament standings, fixtures,
rules and registration for eFootball Nepal competitions." },
{ property: "og:title", content: "Tournament — eFootball Nepal"
},
{ property: "og:description", content: "Tournament standings,
fixtures, rules and registration." }, { property: "og:type", content: "website" },
{ name: "twitter:card", content: "summary_large_image" },
],
}),
component: TournamentDetailPage,
});
const TABS = [
{ id: "overview", label: "Overview", icon: Trophy },
{ id: "standings", label: "Standings", icon: Table2 },
{ id: "fixtures", label: "Fixtures", icon: List },
{ id: "rules", label: "Rules", icon: FileText },
{ id: "report", label: "Report", icon: ShieldAlert },
] as const;
function TournamentDetailPage() {
const { id } = Route.useParams();
const [tab, setTab] = useState<string>("overview");
const { data, isLoading } = useQuery({
queryKey: ["public_tournament", id],
queryFn: async () => {
const [t, p, m, md, s] = await Promise.all([
supabase.from("tournaments").select("*").eq("id",
id).maybeSingle(),
supabase.from("tournament_participants").select("*").eq("tournament_id
", id).eq("status", "approved").order("created_at"),
supabase.from("matches").select("*").eq("tournament_id",
id).order("round").order("position"),
supabase.from("matchdays").select("*").eq("tournament_id",
id).order("sort_order"),
supabase.from("tournament_standings").select("*").eq("tournament_id",
id),
]);
return {
tournament: (t.data as Tournament | null) ?? null,
players: (p.data ?? []) as TournamentParticipant[],
matches: (m.data ?? []) as Match[],
matchdays: (md.data ?? []) as Matchday[],
standings: sortStandings((s.data ?? []) as StandingRow[]),
};
},
});
if (isLoading || !data) {
return ( <PageShell>
<div className="grid min-h-[50vh] place-items-center">
<Loader2 className="h-7 w-7 animate-spin
text-muted-foreground" />
</div>
</PageShell>
);
}
const { tournament, players, matches, matchdays, standings } = data;
if (!tournament) {
return (
<PageShell>
<div className="mx-auto max-w-xl py-24 text-center px-4">
<Trophy className="mx-auto h-10 w-10 text-muted-foreground"
/>
<h1 className="mt-4 text-2xl font-bold">Tournament not
found</h1>
<Button asChild className="mt-6 bg-gradient-brand">
<Link to="/tournaments">Browse tournaments</Link>
</Button>
</div>
</PageShell>
);
}
return (
<PageShell>
<div className="mx-auto max-w-7xl space-y-4 md:space-y-6 px-3
sm:px-4 py-6 md:py-10">
<div className="glass overflow-hidden rounded-2xl
md:rounded-3xl">
{tournament.banner_url && (
<SmartImage src={tournament.banner_url}
alt={tournament.name} ratio="aspect-[21/9]" zoom={false} />
)}
<div className="flex flex-col sm:flex-row sm:items-center
gap-4 p-4 sm:p-6">
<div className="flex items-center gap-3 min-w-0">
<div className="grid h-10 w-10 sm:h-12 sm:w-12 shrink-0
place-items-center rounded-xl bg-gradient-brand">
<Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-white"
/>
</div>
<div className="min-w-0 flex-1">
<div className="flex flex-wrap items-center gap-1.5
sm:gap-2"> <h1 className="text-xl sm:text-2xl md:text-3xl
font-bold truncate">{tournament.name}</h1>
<Badge className="bg-brand/25 text-brand-glow
capitalize text-[10px] sm:text-xs">
{tournament.status.replace(/_/g, " ")}
</Badge>
{tournament.registration_open && (
<Badge className="bg-emerald-500/20
text-emerald-300 text-[10px] sm:text-xs">Registration open</Badge>
)}
</div>
{tournament.description && (
<p className="mt-1 text-xs sm:text-sm
text-muted-foreground line-clamp-2">{tournament.description}</p>
)}
</div>
</div>
{tournament.registration_open && (
<div className="sm:ml-auto shrink-0 w-full sm:w-auto">
<RegisterButton tournament={tournament}
players={players} />
</div>
)}
</div>
</div>
<div className="glass flex overflow-x-auto gap-1.5 rounded-2xl
p-2 [scrollbar-width:none] [-ms-overflow-style:none]
[&::-webkit-scrollbar]:hidden">
{TABS.map((t) => (
<button
key={t.id}
type="button"
onClick={() => setTab(t.id)}
className={cn(
"flex items-center gap-1.5 rounded-xl px-3 py-2
text-xs sm:text-sm font-medium transition whitespace-nowrap shrink-0",
tab === t.id ? "bg-primary text-primary-foreground
shadow-sm" : "hover:bg-accent text-muted-foreground",
)}
>
<t.icon size={15} />
{t.label}
</button>
))}
</div>
<div className="glass rounded-2xl p-4 sm:p-6"> {tab === "overview" && (
<div className="grid gap-3 grid-cols-2 md:grid-cols-4">
<Info icon={<Users className="h-4 w-4 sm:h-5 sm:w-5
text-brand-glow" />} title="Players" value={players.length} />
<Info
icon={<Calendar className="h-4 w-4 sm:h-5 sm:w-5
text-brand-glow" />}
title="Starts"
value={tournament.starts_at ? new
Date(tournament.starts_at).toLocaleDateString() : "—"}
/>
<Info icon={<Award className="h-4 w-4 sm:h-5 sm:w-5
text-brand-glow" />} title="Prize Pool" value={tournament.prize_pool
|| "—"} />
<Info
icon={<List className="h-4 w-4 sm:h-5 sm:w-5
text-brand-glow" />}
title="Matches"
value={`${matches.filter((m) => m.played).length} /
${matches.length}`}
/>
</div>
)}
{tab === "standings" && (
<div>
<h2 className="mb-4 text-lg sm:text-xl
font-bold">Standings</h2>
{standings.length === 0 ? (
<p className="py-6 text-center text-xs sm:text-sm
text-muted-foreground">
Standings appear once matches are played.
</p>
) : (
<div className="overflow-x-auto -mx-4 sm:mx-0">
<div className="inline-block min-w-full align-middle
px-4 sm:px-0">
<table className="min-w-full text-xs sm:text-sm">
<thead>
<tr className="border-b border-border/60
text-left text-[11px] sm:text-xs uppercase tracking-wider
text-muted-foreground">
<th className="p-2 sm:p-3">#</th>
<th className="p-2 sm:p-3 sticky left-0
bg-background/95 sm:bg-transparent">Player</th>
<th className="p-2 sm:p-3
text-center">MP</th>
<th className="p-2 sm:p-3 text-center">W</th>
<th className="p-2 sm:p-3
text-center">D</th>
<th className="p-2 sm:p-3
text-center">L</th>
<th className="p-2 sm:p-3
text-center">GF</th>
<th className="p-2 sm:p-3
text-center">GA</th>
<th className="p-2 sm:p-3
text-center">GD</th>
<th className="p-2 sm:p-3 text-center
font-bold">Pts</th>
</tr>
</thead>
<tbody>
{standings.map((s, i) => (
<tr key={s.participant_id}
className="border-b border-border/40">
<td className="p-2 sm:p-3
text-muted-foreground">{i + 1}</td>
<td className="p-2 sm:p-3 font-semibold
truncate max-w-[120px] sm:max-w-none sticky left-0 bg-background/95
sm:bg-transparent">
{s.player_name}
</td>
<td className="p-2 sm:p-3
text-center">{s.played}</td>
<td className="p-2 sm:p-3
text-center">{s.won}</td>
<td className="p-2 sm:p-3
text-center">{s.drawn}</td>
<td className="p-2 sm:p-3
text-center">{s.lost}</td>
<td className="p-2 sm:p-3
text-center">{s.goals_for}</td>
<td className="p-2 sm:p-3
text-center">{s.goals_against}</td>
<td className="p-2 sm:p-3
text-center">{s.goal_diff > 0 ? `+${s.goal_diff}` : s.goal_diff}</td>
<td className="p-2 sm:p-3 text-center
font-bold text-brand-glow">{s.points}</td>
</tr>
))}
</tbody>
</table>
</div>
</div> )}
</div>
)}
{tab === "fixtures" && (
<PublicFixtures matches={matches} matchdays={matchdays}
players={players} />
)}
{tab === "rules" && (
<div>
<h2 className="mb-3 text-lg sm:text-xl
font-bold">Tournament Rules</h2>
{tournament.rules_text ? (
<p className="whitespace-pre-line text-xs sm:text-sm
leading-relaxed text-muted-foreground">
{tournament.rules_text}
</p>
) : tournament.rules_url ? (
<Button asChild variant="outline" size="sm">
<a href={tournament.rules_url} target="_blank"
rel="noreferrer">
<ExternalLink className="mr-2 h-4 w-4" /> View
rules document
</a>
</Button>
) : (
<p className="py-6 text-center text-xs sm:text-sm
text-muted-foreground">
Rules for this tournament haven't been published
yet.
</p>
)}
{tournament.rules_text && tournament.rules_url && (
<Button asChild variant="outline" size="sm"
className="mt-4">
<a href={tournament.rules_url} target="_blank"
rel="noreferrer">
<ExternalLink className="mr-2 h-4 w-4" /> Full
rules document
</a>
</Button>
)}
</div>
)}
{tab === "report" && <ReportForm tournament={tournament}
players={players} />} </div>
</div>
</PageShell>
);
}
function PublicFixtures({
matches,
matchdays,
players,
}: {
matches: Match[];
matchdays: Matchday[];
players: TournamentParticipant[];
}) {
const groups = useMemo(() => {
const map = new Map<string, Match[]>();
for (const m of matches) {
const label =
matchdays.find((d) => d.id === m.matchday_id)?.name ?? `Round
${m.round}`;
map.set(label, [...(map.get(label) ?? []), m]);
}
return [...map.entries()];
}, [matches, matchdays]);
const [selected, setSelected] = useState<string | null>(null);
const scrollRef = useRef<HTMLDivElement>(null);
const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
const activeName =
selected && groups.some(([n]) => n === selected) ? selected :
groups[0]?.[0] ?? null;
const activeMatches = groups.find(([n]) => n === activeName)?.[1] ??
[];
const selectMatchday = (name: string) => {
setSelected(name);
tabRefs.current.get(name)?.scrollIntoView({ behavior: "smooth",
inline: "center", block: "nearest" });
};
const activeIdx = groups.findIndex(([n]) => n === activeName);
const prevMatchday = () => {
if (activeIdx > 0) selectMatchday(groups[activeIdx - 1][0]);
}; const nextMatchday = () => {
if (activeIdx < groups.length - 1) selectMatchday(groups[activeIdx
+ 1][0]);
};
const labelOf = (id: string | null) => {
if (!id) return "TBD";
const p = players.find((x) => x.id === id);
if (!p) return "TBD";
return p.club?.trim() || p.player_name;
};
const photoOf = (id: string | null) => {
if (!id) return null;
const p = players.find((x) => x.id === id);
return p?.photo_url ?? null;
};
if (matches.length === 0) {
return (
<p className="py-6 text-center text-xs sm:text-sm
text-muted-foreground">
Fixtures haven't been generated yet.
</p>
);
}
return (
<div className="space-y-4">
<div className="flex items-center gap-1 max-w-[380px] mx-auto">
<Button
size="icon"
variant="ghost"
className="h-8 w-8 shrink-0 text-muted-foreground"
disabled={activeIdx <= 0}
onClick={prevMatchday}
>
<ChevronLeft className="h-4 w-4" />
</Button>
<div
ref={scrollRef}
className="flex flex-1 gap-2 overflow-x-auto snap-x
snap-mandatory scroll-smooth [scrollbar-width:none]
[-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-1"
>
{groups.map(([name, list]) => {
const played = list.filter((m) => m.played).length; const isActive = name === activeName;
return (
<button
key={name}
ref={(el) => {
if (el) tabRefs.current.set(name, el);
else tabRefs.current.delete(name);
}}
type="button"
onClick={() => selectMatchday(name)}
className={cn(
"flex shrink-0 min-w-[95px] snap-center flex-col
items-center rounded-xl border px-2.5 py-1.5 text-center transition",
isActive
? "border-brand bg-brand/15 shadow-sm"
: "border-border/60 bg-secondary/30
hover:bg-secondary/50",
)}
>
<div className={cn("text-xs font-semibold truncate
w-full", isActive && "text-brand-glow")}>
{name}
</div>
<div className="text-[10px] text-muted-foreground
mt-0.5">
{played}/{list.length} played
</div>
</button>
);
})}
</div>
<Button
size="icon"
variant="ghost"
className="h-8 w-8 shrink-0 text-muted-foreground"
disabled={activeIdx >= groups.length - 1}
onClick={nextMatchday}
>
<ChevronRight className="h-4 w-4" />
</Button>
</div>
{activeName && (
<div className="flex flex-col w-full max-w-[420px] mx-auto
space-y-2">
{activeMatches.map((m) => {
const home = labelOf(m.home_id); const away = labelOf(m.away_id);
const homePhoto = photoOf(m.home_id);
const awayPhoto = photoOf(m.away_id);
const score =
m.played && m.home_score != null && m.away_score != null
? `${m.home_score} - ${m.away_score}`
: "VS";
return (
<div
key={m.id}
className="flex items-center gap-2 rounded-xl border
border-border/60 px-3 py-2.5 bg-background/40"
>
<div className="flex items-center gap-2 min-w-0 flex-1
justify-end">
<span className="text-xs sm:text-sm font-semibold
truncate max-w-[100px] sm:max-w-[130px] text-right">{home}</span>
<Avatar className="h-7 w-7 sm:h-8 sm:w-8 shrink-0">
<AvatarImage src={homePhoto ?? undefined} />
<AvatarFallback className="bg-secondary
text-[10px]">
{home.slice(0, 2).toUpperCase()}
</AvatarFallback>
</Avatar>
</div>
<div className={cn(
"w-14 shrink-0 text-center text-xs sm:text-sm
font-bold py-1 rounded-md",
m.played ? "text-brand-glow bg-brand/10" :
"text-muted-foreground bg-secondary/40"
)}>
{score}
</div>
<div className="flex items-center gap-2 min-w-0
flex-1">
<Avatar className="h-7 w-7 sm:h-8 sm:w-8 shrink-0">
<AvatarImage src={awayPhoto ?? undefined} />
<AvatarFallback className="bg-secondary
text-[10px]">
{away.slice(0, 2).toUpperCase()}
</AvatarFallback>
</Avatar>
<span className="text-xs sm:text-sm font-semibold
truncate max-w-[100px] sm:max-w-[130px]">{away}</span>
</div> </div>
);
})}
</div>
)}
</div>
);
}
function Info({ icon, title, value }: { icon: React.ReactNode; title:
string; value: React.ReactNode }) {
return (
<div className="rounded-xl border border-border/60 p-3 sm:p-4">
{icon}
<p className="mt-1.5 text-xs text-muted-foreground">{title}</p>
<h3 className="text-base sm:text-lg font-bold
truncate">{value}</h3>
</div>
);
}
function RegisterButton({ tournament, players }: { tournament:
Tournament; players: TournamentParticipant[] }) {
const { user, profile } = useAuth();
const [busy, setBusy] = useState(false);
const existing = user ? players.find((p) => p.user_id === user.id) :
undefined;
if (!user) {
return (
<Button asChild className="bg-gradient-brand w-full sm:w-auto
text-xs sm:text-sm h-9">
<Link to="/auth">
<UserPlus className="mr-1.5 h-4 w-4" /> Sign in to register
</Link>
</Button>
);
}
if (existing) {
return (
<Badge className="bg-emerald-500/20 px-3 py-1.5 text-emerald-300
w-full sm:w-auto justify-center text-xs">
<CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> You're
registered
</Badge>
);
} const register = async () => {
setBusy(true);
const { error } = await
supabase.from("tournament_participants").insert({
tournament_id: tournament.id,
user_id: user.id,
player_name: profile?.full_name || profile?.username ||
user.email?.split("@")[0] || "Player",
club: profile?.favourite_club ?? null,
photo_url: profile?.avatar_url ?? null,
status: "pending",
});
setBusy(false);
if (error) toast.error(error.message);
else toast.success("Registration submitted — an admin will approve
you shortly.");
};
return (
<Button onClick={register} disabled={busy}
className="bg-gradient-brand w-full sm:w-auto text-xs sm:text-sm h-9">
{busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> :
<UserPlus className="mr-1.5 h-4 w-4" />}
Register
</Button>
);
}
function ReportForm({ tournament, players }: { tournament: Tournament;
players: TournamentParticipant[] }) {
const { user } = useAuth();
const [player, setPlayer] = useState("");
const [reason, setReason] = useState("");
const [details, setDetails] = useState("");
const [busy, setBusy] = useState(false);
const [screenshot, setScreenshot] = useState<File | null>(null);
const [screenshotPreview, setScreenshotPreview] = useState<string |
null>(null);
const [myReports, setMyReports] = useState<
{
id: string;
reason: string;
description: string | null;
player_name: string | null;
status: string;
created_at: string;
resolved_at: string | null;
screenshot_url: string | null; }[]
>([]);
const [loadingReports, setLoadingReports] = useState(false);
const loadMyReports = async () => {
if (!user) return;
setLoadingReports(true);
const { data, error } = await supabase
.from("reports")
.select("id, reason, description, player_name, status,
created_at, resolved_at, screenshot_url")
.eq("reporter_id", user.id)
.eq("tournament_id", tournament.id)
.order("created_at", { ascending: false });
setLoadingReports(false);
if (error) {
console.error(error);
return;
}
setMyReports(data ?? []);
};
useEffect(() => {
void loadMyReports();
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [user?.id, tournament.id]);
useEffect(() => {
if (!screenshot) {
setScreenshotPreview(null);
return;
}
const url = URL.createObjectURL(screenshot);
setScreenshotPreview(url);
return () => URL.revokeObjectURL(url);
}, [screenshot]);
if (!user) {
return (
<div className="py-6 text-center">
<ShieldAlert className="mx-auto h-8 w-8 text-muted-foreground"
/>
<p className="mt-2 text-xs sm:text-sm
text-muted-foreground">Sign in to submit a report and track
status.</p>
<Button asChild className="mt-4 bg-gradient-brand size-sm
text-xs">
<Link to="/auth">Sign in</Link> </Button>
</div>
);
}
const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) =>
{
const file = e.target.files?.[0];
if (!file) return;
if (!file.type.startsWith("image/")) {
toast.error("Please select an image file.");
return;
}
if (file.size > 5 * 1024 * 1024) {
toast.error("Screenshot must be under 5MB.");
return;
}
setScreenshot(file);
};
const submit = async () => {
if (!reason.trim()) {
toast.error("Please give a short reason.");
return;
}
setBusy(true);
let screenshotUrl: string | null = null;
if (screenshot) {
const ext = screenshot.name.split(".").pop() || "png";
const path = `${user.id}/${tournament.id}-${Date.now()}.${ext}`;
const { error: uploadError } = await supabase.storage
.from("report-screenshots")
.upload(path, screenshot, { upsert: false });
if (uploadError) {
setBusy(false);
toast.error(`Screenshot upload failed:
${uploadError.message}`);
return;
}
const { data: publicUrlData } =
supabase.storage.from("report-screenshots").getPublicUrl(path);
screenshotUrl = publicUrlData.publicUrl;
} const selectedPlayer = players.find((p) => p.id === player);
const { error } = await supabase.from("reports").insert({
reporter_id: user.id,
type: player ? "player" : "tournament",
tournament_id: tournament.id,
player_name: selectedPlayer?.player_name ?? null,
reason: reason.trim(),
description: details.trim() || null,
screenshot_url: screenshotUrl,
status: "pending",
});
setBusy(false);
if (error) {
toast.error(error.message);
return;
}
toast.success("Report submitted — an admin will review it
shortly.");
setPlayer("");
setReason("");
setDetails("");
setScreenshot(null);
void loadMyReports();
};
return (
<div className="space-y-6 sm:space-y-8">
<div className="space-y-4">
<h2 className="text-lg sm:text-xl font-bold">Submit a
Report</h2>
<div className="grid gap-3 sm:grid-cols-2">
<div className="space-y-1.5">
<label className="text-xs sm:text-sm font-medium
text-muted-foreground">Player (optional)</label>
<Select value={player} onValueChange={setPlayer}>
<SelectTrigger className="h-9 text-xs sm:text-sm">
<SelectValue placeholder="General tournament issue" />
</SelectTrigger>
<SelectContent>
{players.map((p) => (
<SelectItem key={p.id} value={p.id}
className="text-xs sm:text-sm">
{p.player_name} </SelectItem>
))}
</SelectContent>
</Select>
</div>
<div className="space-y-1.5">
<label className="text-xs sm:text-sm font-medium
text-muted-foreground">Reason</label>
<Input
className="h-9 text-xs sm:text-sm"
value={reason}
onChange={(e) => setReason(e.target.value)}
placeholder="e.g. No-show, unfair play, wrong score"
/>
</div>
</div>
<div className="space-y-1.5">
<label className="text-xs sm:text-sm font-medium
text-muted-foreground">Details (optional)</label>
<Textarea
className="text-xs sm:text-sm"
value={details}
onChange={(e) => setDetails(e.target.value)}
placeholder="Explain what happened..."
rows={3}
/>
</div>
<div className="space-y-1.5">
<label className="text-xs sm:text-sm font-medium
text-muted-foreground">Screenshot (optional)</label>
<div className="flex flex-wrap items-center gap-2">
<Button asChild variant="outline" size="sm" type="button"
className="text-xs h-8">
<label className="cursor-pointer">
<input type="file" accept="image/*" className="hidden"
onChange={handleFileChange} />
Choose image
</label>
</Button>
{screenshot && (
<span className="truncate text-xs text-muted-foreground
max-w-[180px]">{screenshot.name}</span>
)}
</div>
{screenshotPreview && ( <img
src={screenshotPreview}
alt="Screenshot preview"
className="mt-2 max-h-36 rounded-lg border
border-border/60 object-contain"
/>
)}
</div>
<Button onClick={submit} disabled={busy}
className="bg-gradient-brand w-full sm:w-auto h-9 text-xs sm:text-sm">
{busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
: <ShieldAlert className="mr-1.5 h-4 w-4" />}
Submit report
</Button>
</div>
<div className="space-y-3 border-t border-border/60 pt-5">
<h3 className="text-base sm:text-lg font-semibold">Your
reports for this tournament</h3>
{loadingReports ? (
<div className="grid place-items-center py-6">
<Loader2 className="h-5 w-5 animate-spin
text-muted-foreground" />
</div>
) : myReports.length === 0 ? (
<p className="py-2 text-xs sm:text-sm
text-muted-foreground">You haven't submitted any reports yet.</p>
) : (
<div className="space-y-2.5">
{myReports.map((r) => (
<div key={r.id} className="flex gap-3 rounded-xl border
border-border/60 p-3 bg-background/30">
{r.screenshot_url && (
<img
src={r.screenshot_url}
alt="Report screenshot"
className="h-14 w-14 shrink-0 rounded-lg
object-cover"
/>
)}
<div className="min-w-0 flex-1">
<div className="flex flex-wrap items-center
gap-1.5">
<span className="font-semibold text-xs
sm:text-sm">{r.player_name || "Tournament issue"}</span>
<StatusBadge status={r.status} /> </div>
<p className="mt-0.5 text-xs
text-muted-foreground">{r.reason}</p>
{r.description && (
<p className="mt-0.5 text-xs
text-muted-foreground/80 whitespace-pre-line
line-clamp-2">{r.description}</p>
)}
<p className="mt-1 text-[10px]
text-muted-foreground">
Submitted {new
Date(r.created_at).toLocaleString()}
{r.resolved_at && ` · Resolved ${new
Date(r.resolved_at).toLocaleString()}`}
</p>
</div>
</div>
))}
</div>
)}
</div>
</div>
);
}
function StatusBadge({ status }: { status: string }) {
const styles: Record<string, string> = {
pending: "bg-amber-500/20 text-amber-300",
resolved: "bg-emerald-500/20 text-emerald-300",
rejected: "bg-red-500/20 text-red-300",
};
return (
<Badge className={cn("capitalize text-[10px] px-1.5 py-0",
styles[status] ?? "bg-secondary text-muted-foreground")}>
{status.replace(/_/g, " ")}
</Badge>
);
}
