import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Tournament } from "@/lib/supabase";
import { sortStandings, type TournamentData } from "./shared";

interface StandingsProps {
  tournament?: Tournament | any;
  data: TournamentData;
}

export function StandingsTab({ tournament, data }: StandingsProps) {
  const rows = sortStandings(data.standings);
  const [loading, setLoading] = useState(false);

  const displayName = (club: string | null, playerName: string) =>
    club?.trim() || playerName;

  const logoOf = (participantId: string) => {
    const p = data.players.find((x) => x.id === participantId);
    return p?.club_logo_url || p?.photo_url || null;
  };

  // 1. Dynamic Tournament Title Resolver (Exact Admin Name Fix)
  const getTournamentTitle = (): string => {
    const d = data as any;
    const t = tournament as any;

    return (
      t?.name ||
      t?.title ||
      d?.tournament?.name ||
      d?.tournament?.title ||
      d?.name ||
      d?.title ||
      d?.tournament_name ||
      "eFootball Tournament"
    );
  };

  // Image Loader (Mobile, Local & Remote Assets CORS Safe)
  const fetchImageSafe = (url: string): Promise<HTMLImageElement | null> => {
    return new Promise((resolve) => {
      if (!url) return resolve(null);

      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => resolve(img);
      img.onerror = () => {
        if (url.startsWith("/")) {
          const absImg = new Image();
          absImg.crossOrigin = "anonymous";
          absImg.onload = () => resolve(absImg);
          absImg.onerror = () => resolve(null);
          absImg.src = `${window.location.protocol}//${window.location.host}${url}`;
        } else if (url.startsWith("http")) {
          const proxyImg = new Image();
          proxyImg.crossOrigin = "anonymous";
          proxyImg.onload = () => resolve(proxyImg);
          proxyImg.onerror = () => resolve(null);
          proxyImg.src = `https://images.weserv.nl/?url=${encodeURIComponent(url)}`;
        } else {
          resolve(null);
        }
      };

      img.src = url.startsWith("/") 
        ? `${window.location.origin}${url}` 
        : url;
    });
  };

  // Canvas Image Generator for Download
  const handleSaveImage = async () => {
    if (loading || rows.length === 0) return;
    setLoading(true);

    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const width = 680;
      const rowHeight = 36;
      const headerHeight = 130;
      const tableHeaderHeight = 32;
      const height = headerHeight + tableHeaderHeight + rows.length * rowHeight + 20;

      canvas.width = width * 2; // High Resolution Retina
      canvas.height = height * 2;
      ctx.scale(2, 2);

      // Dark Theme Canvas Background
      ctx.fillStyle = "#0b1220";
      ctx.fillRect(0, 0, width, height);

      // --- TOURNAMENT LOGO SELECTION ---
      const tournamentLogoUrl =
        (tournament as any)?.logo_url ||
        (tournament as any)?.banner_url ||
        (data as any)?.tournament?.logo_url ||
        (data as any)?.logo_url ||
        "/pwa-512x512.png";

      let textStartX = 20;

      if (tournamentLogoUrl) {
        const logoImg = await fetchImageSafe(tournamentLogoUrl);
        if (logoImg) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(54, 58, 30, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(logoImg, 24, 28, 60, 60);
          ctx.restore();

          textStartX = 100; // Text position shifted right when logo exists
        }
      }

      // --- HEADER TEXT DESIGN ---
      // 1. eFootball Nepal Brand (Highlighted Large Font)
      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText("eFootball Nepal", textStartX, 42);

      // 2. Tournament Name (Exact Admin Title e.g., eFootball World Cup)
      const tournamentTitle = getTournamentTitle();
      ctx.fillStyle = "#ffffff";
      ctx.font = "600 15px sans-serif";
      const truncatedTitle =
        tournamentTitle.length > 38
          ? tournamentTitle.substring(0, 35) + "..."
          : tournamentTitle;
      ctx.fillText(truncatedTitle, textStartX, 66);

      // 3. Sub-header (Official Standings • Date)
      const currentDate = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      ctx.fillStyle = "#94a3b8";
      ctx.font = "12px sans-serif";
      ctx.fillText(`Official Standings • ${currentDate}`, textStartX, 88);

      // Separator Line
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(20, 110);
      ctx.lineTo(width - 20, 110);
      ctx.stroke();

      // --- TABLE HEADER (F & A included) ---
      let startY = headerHeight;
      ctx.fillStyle = "#64748b";
      ctx.font = "bold 11px sans-serif";

      ctx.fillText("#", 25, startY + 18);
      ctx.fillText("CLUB", 85, startY + 18);
      ctx.fillText("PTS", 370, startY + 18);
      ctx.fillText("P", 415, startY + 18);
      ctx.fillText("W", 450, startY + 18);
      ctx.fillText("D", 485, startY + 18);
      ctx.fillText("L", 520, startY + 18);
      ctx.fillText("F", 555, startY + 18);
      ctx.fillText("A", 590, startY + 18);
      ctx.fillText("GD", 630, startY + 18);

      // Border Line Under Header
      ctx.beginPath();
      ctx.moveTo(20, startY + 28);
      ctx.lineTo(width - 20, startY + 28);
      ctx.stroke();

      // --- TABLE ROWS ---
      startY += tableHeaderHeight;

      for (let i = 0; i < rows.length; i++) {
        const s = rows[i] as any;
        const y = startY + i * rowHeight;
        const name = displayName(s.club, s.player_name);
        const logoUrl = logoOf(s.participant_id);

        // Highlight top 3 rows
        if (i === 0) {
          ctx.fillStyle = "rgba(234, 179, 8, 0.12)";
          ctx.fillRect(20, y + 2, width - 40, rowHeight - 4);
        } else if (i === 1) {
          ctx.fillStyle = "rgba(148, 163, 184, 0.12)";
          ctx.fillRect(20, y + 2, width - 40, rowHeight - 4);
        } else if (i === 2) {
          ctx.fillStyle = "rgba(217, 119, 6, 0.12)";
          ctx.fillRect(20, y + 2, width - 40, rowHeight - 4);
        } else if (i % 2 === 0) {
          ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
          ctx.fillRect(20, y, width - 40, rowHeight);
        }

        // Rank Number
        ctx.fillStyle =
          i === 0 ? "#facc15" : i === 1 ? "#cbd5e1" : i === 2 ? "#fb923c" : "#64748b";
        ctx.font = i < 3 ? "bold 13px sans-serif" : "12px sans-serif";
        ctx.fillText(`${i + 1}`, 25, y + 22);

        // Club / Player Logo
        if (logoUrl) {
          const clubImg = await fetchImageSafe(logoUrl);
          if (clubImg) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(62, y + 18, 10, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(clubImg, 52, y + 8, 20, 20);
            ctx.restore();
          } else {
            ctx.fillStyle = "#1e293b";
            ctx.beginPath();
            ctx.arc(62, y + 18, 10, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Club / Player Name
        ctx.fillStyle =
          i === 0 ? "#fef08a" : i === 1 ? "#f1f5f9" : i === 2 ? "#ffedd5" : "#ffffff";
        ctx.font = i < 3 ? "bold 12px sans-serif" : "500 12px sans-serif";
        const truncatedName =
          name.length > 28 ? name.substring(0, 25) + "..." : name;
        ctx.fillText(truncatedName, 85, y + 22);

        // Points & Played Matches
        ctx.font = "12px sans-serif";
        ctx.fillStyle = i < 3 ? "#ffffff" : "#f8fafc";
        ctx.fillText(`${s.points}`, 370, y + 22);

        ctx.fillStyle = "#94a3b8";
        ctx.fillText(`${s.played}`, 415, y + 22);
        ctx.fillText(`${s.won}`, 450, y + 22);
        ctx.fillText(`${s.drawn}`, 485, y + 22);
        ctx.fillText(`${s.lost}`, 520, y + 22);

        // F (Goals For) & A (Goals Against) Values
        ctx.fillText(`${s.goals_for ?? s.gf ?? 0}`, 555, y + 22);
        ctx.fillText(`${s.goals_against ?? s.ga ?? 0}`, 590, y + 22);

        const gdStr = s.goal_diff > 0 ? `+${s.goal_diff}` : `${s.goal_diff}`;
        ctx.fillText(gdStr, 630, y + 22);

        // Row Separator Line
        ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
        ctx.beginPath();
        ctx.moveTo(20, y + rowHeight);
        ctx.lineTo(width - 20, y + rowHeight);
        ctx.stroke();
      }

      // --- SAVE AND DOWNLOAD IMAGE ---
      canvas.toBlob((blob) => {
        if (!blob) return;
        const fileName = `${tournamentTitle.replace(/\s+/g, "_")}_Standings.png`;
        const pngUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = pngUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(pngUrl);

        toast.success("Image Saved Successfully!");
      }, "image/png");
    } catch (err) {
      console.error("Error saving standings image:", err);
      toast.error("Failed to generate image.");
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
      {/* Top Action Bar */}
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

      {/* Screen Table UI */}
      <div className="glass rounded-2xl overflow-x-auto bg-background">
        <table className="w-full text-sm min-w-[650px]">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-muted-foreground border-b border-border/60">
              <th className="p-2.5 text-left w-10">#</th>
              <th className="p-2.5 text-left">Club</th>
              <th className="p-2.5 text-center font-bold">Pts</th>
              <th className="p-2.5 text-center">P</th>
              <th className="p-2.5 text-center">W</th>
              <th className="p-2.5 text-center">D</th>
              <th className="p-2.5 text-center">L</th>
              <th className="p-2.5 text-center">F</th>
              <th className="p-2.5 text-center">A</th>
              <th className="p-2.5 text-center">GD</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s: any, i) => {
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
                  <td className="p-2.5 text-center text-xs">{s.goals_for ?? s.gf ?? 0}</td>
                  <td className="p-2.5 text-center text-xs">{s.goals_against ?? s.ga ?? 0}</td>
                  <td className="p-2.5 text-center text-xs">
                    {s.goal_diff > 0 ? `+${s.goal_diff}` : s.goal_diff}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
                        }
              
