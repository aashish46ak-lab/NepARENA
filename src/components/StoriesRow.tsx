import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  listActiveStories,
  createStory,
  markStoryViewed,
  type StoryGroup,
} from "@/lib/stories";
import { uploadPublicImage } from "@/lib/upload";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Loader2, Plus, X, ImagePlus } from "lucide-react";
import { toast } from "sonner";

const BGS = ["#0ea5e9", "#8b5cf6", "#ef4444", "#10b981", "#f59e0b", "#0a0a0a"];

/** Horizontal stories strip + viewer — in-app, no external apps needed */
export function StoriesRow({ className }: { className?: string }) {
  const { user, profile } = useAuth();
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState<{ group: StoryGroup; index: number } | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [textDraft, setTextDraft] = useState("");
  const [bg, setBg] = useState("#0ea5e9");
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    if (!user?.id) {
      setGroups([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setGroups(await listActiveStories(user.id));
    } catch (e) {
      console.warn("stories", e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!viewer || !user) return;
    const s = viewer.group.stories[viewer.index];
    if (s && !s.seen) {
      void markStoryViewed(s.id, user.id);
    }
    const t = window.setTimeout(() => {
      if (viewer.index + 1 < viewer.group.stories.length) {
        setViewer({ group: viewer.group, index: viewer.index + 1 });
      } else {
        setViewer(null);
      }
    }, 5000);
    return () => window.clearTimeout(t);
  }, [viewer?.group.user_id, viewer?.index, user?.id]);

  const submitText = async () => {
    if (!user || !textDraft.trim()) return;
    setBusy(true);
    const res = await createStory({
      userId: user.id,
      mediaType: "text",
      body: textDraft.trim().slice(0, 120),
      bgColor: bg,
    });
    setBusy(false);
    if (res.error) toast.error(res.error);
    else {
      toast.success("Story posted");
      setComposeOpen(false);
      setTextDraft("");
      void reload();
    }
  };

  const submitPhoto = async (file: File) => {
    if (!user) return;
    setBusy(true);
    try {
      const url = await uploadPublicImage(file, "stories");
      const res = await createStory({ userId: user.id, mediaType: "photo", mediaUrl: url });
      if (res.error) toast.error(res.error);
      else {
        toast.success("Photo story posted");
        setComposeOpen(false);
        void reload();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    }
    setBusy(false);
  };

  if (!user) return null;

  const story = viewer?.group.stories[viewer.index];

  return (
    <div className={cn("w-full", className)}>
      <div className="flex gap-3 overflow-x-auto pb-1 pt-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setComposeOpen(true)}
          className="flex w-16 shrink-0 flex-col items-center gap-1"
        >
          <div className="relative">
            <Avatar className="h-14 w-14 ring-2 ring-white/20">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback>{(profile?.username || "U").slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-sky-500 text-white ring-2 ring-[#0a0a0a]">
              <Plus className="h-3 w-3" />
            </span>
          </div>
          <span className="w-full truncate text-center text-[10px] text-neutral-400">Your story</span>
        </button>

        {loading && (
          <div className="flex items-center px-2">
            <Loader2 className="h-5 w-5 animate-spin text-neutral-500" />
          </div>
        )}

        {groups
          .filter((g) => g.user_id !== user.id || g.stories.length > 0)
          .map((g) => (
            <button
              key={g.user_id}
              type="button"
              onClick={() => setViewer({ group: g, index: 0 })}
              className="flex w-16 shrink-0 flex-col items-center gap-1"
            >
              <Avatar
                className={cn(
                  "h-14 w-14 ring-2 ring-offset-2 ring-offset-[#0a0a0a]",
                  g.hasUnseen ? "ring-sky-400" : "ring-white/15",
                )}
              >
                <AvatarImage src={g.avatar ?? undefined} />
                <AvatarFallback>{g.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="w-full truncate text-center text-[10px] text-neutral-400">{g.name}</span>
            </button>
          ))}
      </div>

      {composeOpen && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 p-3 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl border border-white/12 bg-[#121214] p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">New story</h3>
              <button type="button" onClick={() => setComposeOpen(false)} className="text-neutral-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            <Input
              value={textDraft}
              onChange={(e) => setTextDraft(e.target.value)}
              placeholder="Say something…"
              maxLength={120}
              className="border-white/10 bg-white/5"
            />
            <div className="mt-2 flex gap-1.5">
              {BGS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setBg(c)}
                  className={cn("h-7 w-7 rounded-full ring-2", bg === c ? "ring-white" : "ring-transparent")}
                  style={{ background: c }}
                />
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <label className="flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-xl border border-white/10 py-2 text-xs text-neutral-300">
                <ImagePlus className="h-3.5 w-3.5" /> Photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void submitPhoto(f);
                  }}
                />
              </label>
              <Button
                size="sm"
                className="flex-1 bg-sky-500 text-white"
                disabled={busy || !textDraft.trim()}
                onClick={() => void submitText()}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post text"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {viewer && story && (
        <div
          className="fixed inset-0 z-[100] flex flex-col bg-black"
          onClick={() => {
            if (viewer.index + 1 < viewer.group.stories.length) {
              setViewer({ group: viewer.group, index: viewer.index + 1 });
            } else setViewer(null);
          }}
        >
          <div className="flex gap-1 px-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
            {viewer.group.stories.map((_, i) => (
              <div key={i} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/25">
                <div
                  className={cn("h-full bg-white transition-all", i < viewer.index ? "w-full" : i === viewer.index ? "w-full animate-pulse" : "w-0")}
                />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 px-3 py-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={viewer.group.avatar ?? undefined} />
              <AvatarFallback>{viewer.group.name.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-semibold text-white">{viewer.group.name}</span>
            <button type="button" className="ml-auto text-white" onClick={(e) => { e.stopPropagation(); setViewer(null); }}>
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-1 items-center justify-center p-4">
            {story.media_type === "photo" && story.media_url ? (
              <img src={story.media_url} alt="" className="max-h-full max-w-full object-contain" />
            ) : (
              <div
                className="flex min-h-[40vh] w-full max-w-sm items-center justify-center rounded-2xl p-6 text-center text-lg font-semibold text-white"
                style={{ background: story.bg_color || "#0ea5e9" }}
              >
                {story.body}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
