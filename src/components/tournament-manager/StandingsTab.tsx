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

  // Player / Club Logo Picker
  const logoOf = (participantId: string) => {
    const p = data.players.find((x) => x.id === participantId);
    return (
      p?.club_logo_url ||
      p?.photo_url ||
      (p as any)?.logo ||
      (p as any)?.avatar_url ||
      null
    );
  };

  // Exact Admin Tournament Name Extractor
  const getTournamentTitle = (): string => {
    const d = data as any;
    const t = tournament as any;

    if (t?.name) return t.name;
    if (t?.title) return t.title;
    if (d?.tournament?.name) return d.tournament.name;
    if (d?.tournament?.title) return d.tournament.title;
    if (d?.name) return d.name;
    if (d?.title) return d.title;

    return "eFootball Tournament";
  };

  // CORS Safe Image Loader
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

  // FB-style Default User Avatar Canvas Drawer (Theme Matching)
  const drawDefaultUserAvatar = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number
  ) => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // Background Circle
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);

    // Head
    ctx.fillStyle = "#64748b";
    ctx.beginPath();
    ctx.arc(x, y - radius * 0.2, radius * 0.38, 0, Math.PI * 2);
    ctx.fill();

    // Body / Shoulders
    ctx.beginPath();
    ctx.arc(x, y + radius * 0.95, radius * 0.72, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  // Save Image Handler
  const handleSaveImage = async () => {
    if (loading || rows.length === 0) return;
    setLoading(true);

    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const width = 720;
      const rowHeight = 38;
      const headerHeight = 135;
      const tableHeaderHeight = 32;
      const height = headerHeight + tableHeaderHeight + rows.length * rowHeight + 20;

      canvas.width = width * 2; // Retina Resolution
      canvas.height = height * 2;
      ctx.scale(2, 2);

      // Dark Background
      ctx.fillStyle = "#0b1220";
      ctx.fillRect(0, 0, width, height);

      // --- 1. LEFT SIDE: BRAND LOGO + TITLE ---
      const appLogoUrl = "/pwa-512x512.png";
      const appLogoImg = await fetchImageSafe(appLogoUrl) || await fetchImageSafe("/pwa-192x192.png");

      if (appLogoImg) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(55, 58, 30, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(appLogoImg, 25, 28, 60, 60);
        ctx.restore();
      }

      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 22px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("eFootball Nepal", 98, 63);

      // --- 2. CENTER SECTION: SUBTLE VERTICAL DIVIDER LINE ---
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(width / 2, 36);
      ctx.lineTo(width / 2, 82);
      ctx.stroke();

      // --- 3. RIGHT SIDE: TOURNAMENT NAME & SUB-INFO ---
      const tournamentTitle = getTournamentTitle();
      const rightX = width - 24;

      ctx.textAlign = "right";

      // White Tournament Name (Bold 20px)
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 20px sans-serif";
      const truncatedTitle =
        tournamentTitle.length > 25
          ? tournamentTitle.substring(0, 22) + "..."
          : tournamentTitle;
      ctx.fillText(truncatedTitle, rightX, 52);

      // Date & Subtitle
      const currentDate = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      ctx.fillStyle = "#94a3b8";
      ctx.font = "500 12px sans-serif";
      ctx.fillText(`Official Standings • ${currentDate}`, rightX, 74);

      // Reset Alignment
      ctx.textAlign = "left";

      // Header Horizontal Separator
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(20, 112);
      ctx.lineTo(width - 20, 112);
      ctx.stroke();

      // --- TABLE HEADER ---
      let startY = headerHeight;
      ctx.fillStyle = "#64748b";
      ctx.font = "bold 11px sans-serif";

      ctx.fillText("#", 25, startY + 18);
      ctx.fillText("CLUB / PLAYER", 95, startY + 18);
      ctx.fillText("PTS", 410, startY + 18);
      ctx.fillText("P", 455, startY + 18);
      ctx.fillText("W", 490, startY + 18);
      ctx.fillText("D", 525, startY + 18);
      ctx.fillText("L", 560, startY + 18);
      ctx.fillText("F", 595, startY + 18);
      ctx.fillText("A", 630, startY + 18);
      ctx.fillText("GD", 670, startY + 18);

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

        // Podium Row Highlight Effects
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
        ctx.fillText(`${i + 1}`, 25, y + 23);

        // --- PLAYER / CLUB LOGO WITH FB-STYLE FALLBACK ---
        const loadedClubImg = logoUrl ? await fetchImageSafe(logoUrl) : null;

        if (loadedClubImg) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(68, y + 19, 11, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(loadedClubImg, 57, y + 8, 22, 22);
          ctx.restore();
        } else {
          // DrawFB-style Default User Icon matching theme
          drawDefaultUserAvatar(ctx, 68, y + 19, 11);
        }

        // Name
        ctx.fillStyle =
          i === 0 ? "#fef08a" : i === 1 ? "#f1f5f9" : i === 2 ? "#ffedd5" : "#ffffff";
        ctx.font = i < 3 ? "bold 12px sans-serif" : "500 12px sans-serif";
        const truncatedName =
          name.length > 28 ? name.substring(0, 25) + "..." : name;
        ctx.fillText(truncatedName, 95, y + 23);

        // Stats
        ctx.font = "12px sans-serif";
        ctx.fillStyle = i < 3 ? "#ffffff" : "#f8fafc";
        ctx.fillText(`${s.points}`, 410, y + 23);

        ctx.fillStyle = "#94a3b8";
        ctx.fillText(`${s.played}`, 455, y + 23);
        ctx.fillText(`${s.won}`, 490, y + 23);
        ctx.fillText(`${s.drawn}`, 525, y + 23);
        ctx.fillText(`${s.lost}`, 560, y + 23);
        ctx.fillText(`${s.goals_for ?? s.gf ?? 0}`, 595, y + 23);
        ctx.fillText(`${s.goals_against ?? s.ga ?? 0}`, 630, y + 23);

        const gdStr = s.goal_diff > 0 ? `+${s.goal_diff}` : `${s.goal_diff}`;
        ctx.fillText(gdStr, 670, y + 23);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
        ctx.beginPath();
        ctx.moveTo(20, y + rowHeight);
        ctx.lineTo(width - 20, y + rowHeight);
        ctx.stroke();
      }

      // --- SAVE IMAGE ---
      canvas.toBlob((blob) => {
        if (!blob) return;
        const safeFileName = tournamentTitle 
          ? `${tournamentTitle.replace(/\s+/g, "_")}_Standings.png`
          : "eFootball_Standings.png";
          
        const pngUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = pngUrl;
        link.download = safeFileName;
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

      {/* Screen Table */}
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
