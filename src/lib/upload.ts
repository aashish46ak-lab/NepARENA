import { supabase } from "./supabase";
import { compressImageToWebp } from "./compress-image";

export async function uploadPublicImage(file: File, bucket = "proofs"): Promise<string> {
  // Compress and convert to WebP before upload
  const compressedFile = await compressImageToWebp(file, 1200, 0.75);

  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(fileName, compressedFile, {
      contentType: "image/webp",
      cacheControl: "3600",
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
  return data.publicUrl;
}
