import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Images, ImagePlus, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { uploadPublicImage } from "@/lib/upload";

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed border-white/10 px-3 py-6 text-center text-xs text-neutral-500">{text}</p>;
}

export function GalleryBlock({ organizerId, items, userId, onPosted }: {
  organizerId: string;
  items: { id: string; image_url: string; caption: string | null }[];
  userId?: string;
  onPosted: () => void;
}) {
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (file: File | null) => {
    if (!file || !userId) { if (!userId) toast.message("Sign in to post"); return; }
    setUploading(true);
    try {
      const url = await uploadPublicImage(file, "efn-public", { folder: "gallery" });
      setPreview(url);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Upload failed"); }
    finally { setUploading(false); }
  };

  const submit = async () => {
    if (!userId || !preview) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("posts").insert({ author_id: userId, organizer_id: organizerId, body: `[gallery] ${caption.trim()}`.trim(), image_url: preview });
      if (error) throw error;
      toast.success("Posted to gallery");
      setCaption(""); setPreview(null); onPosted();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  };

  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Images className="h-3.5 w-3.5 text-violet-300" /> Gallery</h2>
      {userId ? (
        <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onFile(e.target.files?.[0] ?? null)} />
          {preview ? (
            <img src={preview} alt="" className="max-h-48 w-full rounded-xl object-cover" />
          ) : (
            <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()} className="flex w-full flex-col items-center gap-1 rounded-xl border border-dashed border-white/15 py-8 text-neutral-400">
              {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
              <span className="text-xs font-medium">Add photo</span>
            </button>
          )}
          <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Optional caption" className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" />
          <Button size="sm" disabled={!preview || busy} onClick={() => void submit()} className="w-full">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-3.5 w-3.5" />} Post to gallery
          </Button>
        </div>
      ) : (
        <p className="text-center text-xs text-neutral-500">Sign in to post in the gallery</p>
      )}
      {items.length === 0 ? (
        <Empty text="No gallery posts yet — be the first" />
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {items.map((g) => (
            <figure key={g.id} className="overflow-hidden rounded-xl border border-white/10">
              <img src={g.image_url} alt="" className="aspect-square w-full object-cover" />
              {g.caption && <figcaption className="truncate px-2 py-1.5 text-[11px] text-neutral-400">{g.caption}</figcaption>}
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}
