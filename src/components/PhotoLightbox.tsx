/**
 * Full-screen photo viewer with zoom (pinch / buttons) and backdrop dismiss.
 */
import { useEffect, useState } from "react";
import { X, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";

export function PhotoLightbox({
  src,
  open,
  onClose,
  alt = "",
}: {
  src: string | null;
  open: boolean;
  onClose: () => void;
  alt?: string;
}) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!open) setScale(1);
  }, [open, src]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !src) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal
    >
      <button
        type="button"
        className="absolute inset-0 cursor-zoom-out"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[92vh] max-w-[96vw] flex-col items-center gap-3 p-3">
        <div className="flex w-full items-center justify-end gap-2">
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              setScale((s) => Math.max(1, s - 0.35));
            }}
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              setScale((s) => Math.min(3, s + 0.35));
            }}
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-auto max-h-[80vh] max-w-[92vw]">
          <img
            src={src}
            alt={alt}
            className={cn(
              "mx-auto max-h-[80vh] max-w-[92vw] rounded-lg object-contain transition-transform duration-200",
            )}
            style={{ transform: `scale(${scale})` }}
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
}

/** Clickable thumbnail that opens PhotoLightbox */
export function ZoomableImage({
  src,
  alt = "",
  className,
}: {
  src: string;
  alt?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="block w-full cursor-zoom-in text-left"
        onClick={() => setOpen(true)}
      >
        <img src={src} alt={alt} className={className} loading="lazy" />
      </button>
      <PhotoLightbox src={src} open={open} onClose={() => setOpen(false)} alt={alt} />
    </>
  );
}
