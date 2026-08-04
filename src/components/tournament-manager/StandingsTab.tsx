import { useRef, useState } from "react";
import { Download, Loader2, Check } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { sortStandings, type TournamentData } from "./shared";

export function StandingsTab({ data }: { data: TournamentData }) {
  const rows = sortStandings(data.standings);
  const [loading, setLoading] = useState(false);

  const displayName = (club: string | null, playerName: string) =>
    club?.trim() || playerName;

  const logoOf = (participantId: string) => {
    const p = data.players.find((x) => x.id === participantId);
    return p?.club_logo_url || p?.photo_url || null;
  };

  // Canvas-based Clean Compact Download & Gallery Save Handler
  const handleSaveImage = async () => {
    if (loading || rows.length === 0) return;
    setLoading(true);

    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const width = 600;
      const rowHeight = 36;
      const headerHeight = 110;
      const tableHeaderHeight = 32;
      const height = headerHeight + tableHeaderHeight + rows.length * rowHeight + 20;

      canvas.width = width * 2; // High DPI crisp scale
      canvas.height = height * 2;
      ctx.scale(2, 2);

      // Background
      ctx.fillStyle = "#0b1220";
      ctx.fillRect(0, 0, width, height);

      // --- HEADER SECTION ---
      // Brand Logo / Text
      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 16px sans-serif";
      ctx.fillText("eFootball Nepal", 20, 30);

      // Tournament / League Name
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 18px sans-serif";
      const tournamentTitle = data.title || "League Standings";
      ctx.fillText(tournamentTitle, 20, 56);

      // Sub-header & Date
      ctx.fillStyle = "#94a3b8";
      ctx.font = "12px sans-serif";
      const currentDate = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      ctx.fillText(`Official Standings • ${currentDate}`, 20, 76);

      // Separator Line
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(20, 92);
      ctx.lineTo(width - 20, 92);
      ctx.stroke();

      // --- TABLE HEADER ---
      let startY = headerHeight;
      ctx.fillStyle = "#64748b";
      ctx.font = "bold 11px sans-serif";

      ctx.fillText("#", 25, startY + 18);
      ctx.fillText("CLUB", 60, startY + 18);
      ctx.fillText("PTS", 370, startY + 18);
      ctx.fillText("P", 415, startY + 18);
      ctx.fillText("W", 450, startY + 18);
      ctx.fillText("D", 485, startY + 18);
      ctx.fillText("L", 520, startY + 18);
      ctx.fillText("GD", 555, startY + 18);

      // Table Header Line
      ctx.beginPath();
      ctx.moveTo(20, startY + 28);
      ctx.lineTo(width - 20, startY + 28);
      ctx.stroke();

      // --- TABLE ROWS ---
      startY += tableHeaderHeight;

      const loadImage = (url: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = () => reject();
          img.src = url;
        });
      };

      for (let i = 0; i < rows.length; i++) {
        const s = rows[i];
        const y = startY + i * rowHeight;
        const name = displayName(s.club, s.player_name);
        const logoUrl = logoOf(s.participant_id);

        if (i % 2 === 0) {
          ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
          ctx.fillRect(20, y, width - 40, rowHeight);
        }

        // Rank Number
        ctx.fillStyle = i === 0 ? "#f59e0b" : i === 1 ? "#cbd5e1" : i === 2 ? "#d97706" : "#94a3b8";
        ctx.font = "bold 12px sans-serif";
        ctx.fillText(`${i + 1}`, 25, y + 22);

        // Club Logo
        if (logoUrl) {
          try {
            const img = await loadImage(logoUrl);
            ctx.save();
            ctx.beginPath();
            ctx.arc(70, y + 18, 10, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(img, 60, y + 8, 20, 20);
            ctx.restore();
          } catch {
            ctx.fillStyle = "#334155";
            ctx.beginPath();
            ctx.arc(70, y + 18, 10, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Club Name
        ctx.fillStyle = "#ffffff";
        ctx.font = "500 12px sans-serif";
        const truncatedName = name.length > 28 ? name.substring(0, 25) + "..." : name;
        ctx.fillText(truncatedName, 90, y + 22);

        // Stats
        ctx.font = "12px sans-serif";
        ctx.fillStyle = "#f8fafc";
        ctx.fillText(`${s.points}`, 370, y + 22);

        ctx.fillStyle = "#94a3b8";
        ctx.fillText(`${s.played}`, 415, y + 22);
        ctx.fillText(`${s.won}`, 450, y + 22);
        ctx.fillText(`${s.drawn}`, 485, y + 22);
        ctx.fillText(`${s.lost}`, 520, y + 22);

        const gdStr = s.goal_diff > 0 ? `+${s.goal_diff}` : `${s.goal_diff}`;
        ctx.fillText(gdStr, 555, y + 22);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
        ctx.beginPath();
        ctx.moveTo(20, y + rowHeight);
        ctx.lineTo(width - 20, y + rowHeight);
        ctx.stroke();
      }

      // Export Blob
      canvas.toBlob(async (blob) => {
        if (!blob) throw new Error("Canvas Blob failed");
        
        const fileName = `standings-${data.title || "league"}.png`;
        const file = new File([blob], fileName, { type: "image/png" });

        // Mobile Web Share API (Mobile Gallery push option)
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: "Standings Image",
              text: "Official League Standings",
            });
            toast.success("Image saved to Gallery!");
            return;
          } catch (shareErr) {
            // Mobile share canceled/failed, fallback to auto download
          }
        }

        // Standard direct download fallback
        const pngUrl = URL.createObjectURL(blob);
        const downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = fileName;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(pngUrl);

        // Show Toast Notification
        toast.success("Standings Image Saved Successfully!");
      }, "image/png");

    } catch (err) {
      console.error("Error generating standings image:", err);
      toast.error("Failed to save image. Try taking a screenshot.");
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
      {/* Header & Save Button */}
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
          {loading ? "Generating..." : "Save Image"}
        </Button>
      </div>

      {/* Screen Table View */}
      <div className="glass rounded-2xl overflow-x-auto bg-background">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-muted-foreground border-b border-border/60">
              <th className="p-2.5 text-left w-10">#</th>
              <th className="p-2.5 text-left">Club</th>
              <th className="p-2.5 text-center font-bold">Pts</th>
              <th className="p-2.5 text-center">P</th>
              <th className="p-2.5 text-center">W</th>
              <th className="p-2.5 text-center">D</th>
              <th className="p-2.5 text-center">L</th>
              <th className="p-2.5 text-center">GD</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s, i) => {
              const name = displayName(s.club, s.player_name);
              const logo = logoOf(s.participant_id);
              return (
                <tr key={s.participant_id} className="border-b border-border/40 last:border-0">
                  <td className="p-2.5 font-medium text-xs text-muted-foreground">{i + 1}</td>
                  <td className="p-2.5">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarImage src={logo ?? undefined} />
                        <AvatarFallback className="bg-secondary text-[9px]">
                          {name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate font-medium text-xs">{name}</span>
                    </div>
                  </td>
                  <td className="p-2.5 text-center font-bold text-xs">{s.points}</td>
                  <td className="p-2.5 text-center text-xs">{s.played}</td>
                  <td className="p-2.5 text-center text-xs text-emerald-400">{s.won}</td>
                  <td className="p-2.5 text-center text-xs">{s.drawn}</td>
                  <td className="p-2.5 text-center text-xs text-rose-400">{s.lost}</td>
                  <td className="p-2.5 text-center text-xs">{s.goal_diff > 0 ? `+${s.goal_diff}` : s.goal_diff}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
  }
                     
