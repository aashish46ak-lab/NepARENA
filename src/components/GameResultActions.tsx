import { Button } from "@/components/ui/button";
import { downloadGameResultCard, shareGameResult } from "@/lib/game-share";
import { Download, Share2 } from "lucide-react";
import { toast } from "sonner";

export function GameResultActions({
  game,
  headline,
  lines,
  className,
}: {
  game: string;
  headline: string;
  lines: string[];
  className?: string;
}) {
  const onShare = async () => {
    const res = await shareGameResult({
      title: `${game} — NepARENA`,
      text: `${headline}\n${lines.join(" · ")}`,
    });
    if (res.ok && res.method === "clipboard") {
      toast.success("Result copied — paste anywhere to share");
    } else if (!res.ok) {
      toast.error("Could not share");
    }
  };

  const onDownload = async () => {
    const ok = await downloadGameResultCard({ game, headline, lines });
    if (ok) toast.success("Result card downloaded");
    else toast.error("Download failed");
  };

  return (
    <div className={className ?? "flex flex-wrap justify-center gap-2"}>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="border-white/15"
        onClick={() => void onShare()}
      >
        <Share2 className="mr-1.5 h-3.5 w-3.5" /> Share
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="border-white/15"
        onClick={() => void onDownload()}
      >
        <Download className="mr-1.5 h-3.5 w-3.5" /> Download result
      </Button>
    </div>
  );
}
