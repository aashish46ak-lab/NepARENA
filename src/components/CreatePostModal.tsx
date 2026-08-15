/**
 * Top-sheet create-post modal — levitates to top, blurred backdrop, click outside closes.
 * Supports photos + video with sound.
 */
import { useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { uploadPublicImage } from "@/lib/upload";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ImagePlus, Loader2, Send, Video, X } from "lucide-react";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPosted?: () => void;
};

export function CreatePostModal({ open, onOpenChange, onPosted }: Props) {
  const { user } = useAuth();
  const [body, setBody] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setBody("");
    setImages([]);
    previews.forEach((u) => URL.revokeObjectURL(u));
    setPreviews([]);
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideo(null);
    setVideoPreview(null);
  };

  const close = () => {
    onOpenChange(false);
    reset();
  };

  const createPost = async () => {
    if (!user || posting || (!body.trim() && !images.length && !video)) return;
    setPosting(true);
    try {
      const urls: string[] = [];
      for (const f of images) urls.push(await uploadPublicImage(f, "posts"));
      let videoUrl: string | null = null;
      if (video) {
        videoUrl = await uploadPublicImage(video, "posts");
      }
      const { error } = await supabase.from("posts").insert({
        author_id: user.id,
        body: body.trim() || null,
        image_url: urls[0] ?? null,
        image_urls: urls,
        video_url: videoUrl,
      });
      if (error) throw error;
      toast.success("Posted");
      onPosted?.();
      close();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setPosting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) close();
        else onOpenChange(true);
      }}
    >
      <DialogContent
        className={
          "fixed left-1/2 top-0 z-50 w-full max-w-md -translate-x-1/2 translate-y-0 " +
          "max-h-[min(88vh,640px)] overflow-y-auto rounded-b-3xl border border-white/12 " +
          "border-t-0 bg-[#121214]/98 p-0 shadow-2xl backdrop-blur-xl " +
          "data-[state=open]:animate-in data-[state=closed]:animate-out " +
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 " +
          "data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top " +
          "duration-300 sm:top-3 sm:rounded-3xl sm:border-t [&>button]:hidden"
        }
      >
        <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
          <DialogTitle className="text-base font-semibold text-white">
            Create post
          </DialogTitle>
          <button
            type="button"
            onClick={close}
            className="grid h-8 w-8 place-items-center rounded-full text-neutral-400 transition hover:bg-white/10 hover:text-white active:scale-90"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 p-4">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What's on your mind?"
            className="min-h-[100px] resize-none border-white/10 bg-black/30 text-[15px] transition focus:border-sky-500/40"
            maxLength={2000}
            autoFocus
          />
          {previews.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {previews.map((src, i) => (
                <div
                  key={i}
                  className="relative h-24 w-24 overflow-hidden rounded-xl ring-1 ring-white/10"
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setImages((p) => p.filter((_, j) => j !== i));
                      setPreviews((p) => {
                        const u = p[i];
                        if (u) URL.revokeObjectURL(u);
                        return p.filter((_, j) => j !== i);
                      });
                    }}
                    className="absolute right-1 top-1 rounded-full bg-black/70 p-0.5 text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {videoPreview && (
            <div className="relative overflow-hidden rounded-xl ring-1 ring-white/10">
              <video src={videoPreview} controls className="max-h-48 w-full bg-black" playsInline />
              <button
                type="button"
                onClick={() => {
                  if (videoPreview) URL.revokeObjectURL(videoPreview);
                  setVideo(null);
                  setVideoPreview(null);
                }}
                className="absolute right-2 top-2 rounded-full bg-black/70 p-1 text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (!e.target.files?.length) return;
                  const list = Array.from(e.target.files).slice(0, 4 - images.length);
                  setImages((prev) => [...prev, ...list].slice(0, 4));
                  setPreviews((prev) =>
                    [...prev, ...list.map((f) => URL.createObjectURL(f))].slice(0, 4),
                  );
                }}
              />
              <input
                ref={videoRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (f.size > 40 * 1024 * 1024) {
                    toast.error("Video max 40MB");
                    return;
                  }
                  if (videoPreview) URL.revokeObjectURL(videoPreview);
                  setVideo(f);
                  setVideoPreview(URL.createObjectURL(f));
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-neutral-300 transition hover:bg-white/8"
              >
                <ImagePlus className="h-4 w-4 text-sky-400" /> Photo
              </button>
              <button
                type="button"
                onClick={() => videoRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-neutral-300 transition hover:bg-white/8"
              >
                <Video className="h-4 w-4 text-violet-400" /> Video
              </button>
            </div>
            <Button
              size="sm"
              disabled={posting || (!body.trim() && !images.length && !video)}
              onClick={() => void createPost()}
              className="rounded-full bg-sky-500 px-5 text-white hover:bg-sky-400"
            >
              {posting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="mr-1.5 h-3.5 w-3.5" />
              )}
              Post
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
