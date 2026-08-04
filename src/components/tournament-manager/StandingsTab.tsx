import { useRef, useState } from "react";
import { Crown, Medal, Download, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { sortStandings, type TournamentData } from "./shared";

export function StandingsTab({ data }: { data: TournamentData }) {
  const rows = sortStandings(data.standings);
  const cardRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  const displayName = (club: string | null, playerName: string) =>
    club?.trim() || playerName;

  const logoOf = (participantId: string) => {
    const p = data.players.find((x) => x.id === participantId);
    return p?.club_logo_url || p?.photo_url || null;
  };

  // Dynamic CDN Loader function (Mobile Phone friendly, No NPM Terminal needed)
  const handleSaveImage = async () => {
    if (!cardRef.current || loading) return;

    try {
      setLoading(true);

      // Load html-to-image dynamically from CDN
      if (!(window as any).htmlToImage) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js";
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      const htmlToImage = (window as any).htmlToImage;
      if (!htmlToImage) throw new Error("Library not loaded");

      // Generate PNG Data URL
      const dataUrl = await htmlToImage.toPng(cardRef.current, {
        cacheBust: true,
        style: {
          backgroundColor: "#0b1220",
          borderRadius: "16px",
          padding: "16px",
        },
      });

      // Trigger download on phone
      const downloadLink = document.createElement("a");
      downloadLink.href = dataUrl;
      downloadLink.download = `standings-${data.id || "table"}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch (err) {
      console.error("Failed to save image:", err);
      alert("Mobile preview error. Try again or take a screenshot.");
    } finally {
      setLoading(false);
    }
  };

  if (rows.length === 0) {
    return (
      <div className="pt-4">
        <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
          Standings appear once players are approved and results are saved.
        </div>
      </div>
    );
  }

  return (
    <div className="pt-4 space-y-3">
      {/* Header with Save Button */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Tie-breakers: Points → Goal difference → Goals scored.
        </p>
        <Button
          onClick={handleSaveImage}
          disabled={loading}
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5 cursor-pointer active:scale-95 transition-transform"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          {loading ? "Saving..." : "Save Image"}
        </Button>
      </div>

      {/* Target Container to Save */}
      <div ref={cardRef} className="glass rounded-2xl overflow-x-auto bg-background">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-muted-foreground border-b border-border/60">
              <th className="p-3 text-left w-10">#</th>
              <th className="p-3 text-left">Club</th>
              <th className="p-3 text-center font-bold">Pts</th>
              <th className="p-3 text-center">P</th>
              <th className="p-3 text-center">W</th>
              <th className="p-3 text-center">D</th>
              <th className="p-3 text-center">L</th>
              <th className="p-3 text-center">GF</th>
              <th className="p-3 text-center">GA</th>
              <th className="p-3 text-center">GD</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s, i) => {
              const name = displayName(s.club, s.player_name);
              const logo = logoOf(s.participant_id);
              return (
                <tr key={s.participant_id} className="border-b border-border/40 last:border-0">
                  <td className="p-3">
                    <span className="inline-flex items-center gap-1">
                      {i === 0 && <Crown className="h-3.5 w-3.5 text-amber-300" />}
                      {i === 1 && <Medal className="h-3.5 w-3.5 text-slate-300" />}
                      {i === 2 && <Medal className="h-3.5 w-3.5 text-orange-400" />}
                      {i + 1}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarImage src={logo ?? undefined} />
                        <AvatarFallback className="bg-secondary text-[10px]">
                          {name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="truncate font-medium">{name}</div>
                        {s.club && s.club.trim() && s.player_name !== s.club && (
                          <div className="truncate text-xs text-muted-foreground">{s.player_name}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-center font-bold">{s.points}</td>
                  <td className="p-3 text-center">{s.played}</td>
                  <td className="p-3 text-center text-emerald-300">{s.won}</td>
                  <td className="p-3 text-center">{s.drawn}</td>
                  <td className="p-3 text-center text-rose-300">{s.lost}</td>
                  <td className="p-3 text-center">{s.goals_for}</td>
                  <td className="p-3 text-center">{s.goals_against}</td>
                  <td className="p-3 text-center">{s.goal_diff > 0 ? `+${s.goal_diff}` : s.goal_diff}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
                        }
