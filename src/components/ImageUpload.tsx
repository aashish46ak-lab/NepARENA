import { useRef, useState } from "react";
import { Upload, X, ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { uploadPublicImage, removePublicImage } from "@/lib/upload";
import { cn } from "@/lib/utils";

interface Props {
  value: string | null;
  onChange: (url: string | null) => void;
  folder?: string;
  label?: string;
  className?: string;
  aspect?: "square" | "video" | "wide";
}

export function ImageUpload({ value, onChange, folder = "misc", label, className, aspect = "video" }: Props) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const aspectClass = aspect === "square" ? "aspect-square" : aspect === "wide" ? "aspect-[21/9]" : "aspect-video";

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadPublicImage(file, folder);
      onChange(url);
      toast.success("Image uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    if (value) { try { await removePublicImage(value); } catch { /* ignore */ } }
    onChange(null);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && <div className="text-sm font-medium">{label}</div>}
      <div className={cn("glass relative overflow-hidden rounded-xl flex items-center justify-center", aspectClass)}>
        {value ? (
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <ImageIcon className="h-8 w-8" />
            <span className="text-xs">No image</span>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-brand" />
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp" hidden
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        <Button type="button" size="sm" variant="secondary" onClick={() => inputRef.current?.click()} disabled={uploading}>
          <Upload className="h-4 w-4 mr-1.5" />{value ? "Replace" : "Upload image"}
        </Button>
        {value && (
          <Button type="button" size="sm" variant="ghost" onClick={handleRemove} disabled={uploading}>
            <X className="h-4 w-4 mr-1" /> Remove
          </Button>
        )}
      </div>
    </div>
  );
}