import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ImageIcon, Expand } from "lucide-react";

interface Props {
  src?: string | null;
  alt?: string;
  /** aspect ratio wrapper class, e.g. "aspect-video" */
  ratio?: string;
  className?: string;
  imgClassName?: string;
  /** contain keeps the full image visible (default), cover fills the box */
  fit?: "contain" | "cover";
  /** click to open a full-size lightbox */
  zoom?: boolean;
  fallback?: React.ReactNode;
}

export function SmartImage({
  src, alt = "", ratio = "aspect-video", className, imgClassName,
  fit = "contain", zoom = true, fallback,
}: Props) {
  const [open, setOpen] = useState(false);
  const clickable = zoom && !!src;

  return (
    <>
      <div
        className={cn(
          "relative overflow-hidden bg-secondary/60 flex items-center justify-center group",
          ratio, clickable && "cursor-zoom-in", className,
        )}
        onClick={clickable ? () => setOpen(true) : undefined}
        role={clickable ? "button" : undefined}
        tabIndex={clickable ? 0 : undefined}
        onKeyDown={clickable ? (e) => { if (e.key === "Enter") setOpen(true); } : undefined}
      >
        {src ? (
          <>
            {/* soft blurred backdrop so contained images never look empty */}
            <img src={src} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover blur-2xl scale-110 opacity-30" />
            <img
              src={src}
              alt={alt}
              loading="lazy"
              className={cn("relative h-full w-full", fit === "cover" ? "object-cover" : "object-contain", imgClassName)}
            />
            {clickable && (
              <span className="absolute bottom-2 right-2 rounded-md bg-background/70 p-1.5 opacity-0 group-hover:opacity-100 transition">
                <Expand className="h-3.5 w-3.5" />
              </span>
            )}
          </>
        ) : (
          fallback ?? (
            <div className="flex flex-col items-center gap-1 text-muted-foreground">
              <ImageIcon className="h-7 w-7" />
            </div>
          )
        )}
      </div>

      {clickable && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="glass max-w-5xl p-2 sm:p-3">
            <img src={src!} alt={alt} className="max-h-[80vh] w-full object-contain rounded-lg" />
            {alt && <div className="text-center text-sm text-muted-foreground pb-1">{alt}</div>}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}