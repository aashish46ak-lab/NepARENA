import { supabase, PUBLIC_BUCKET } from "./supabase";

const ALLOWED = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

export async function uploadPublicImage(file: File, folder = "misc"): Promise<string> {
  if (!ALLOWED.includes(file.type)) throw new Error("Only PNG, JPG, or WEBP images are allowed.");
  if (file.size > MAX_BYTES) throw new Error("Image must be under 5MB.");
  const ext = file.name.split(".").pop() ?? "png";
  const key = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(PUBLIC_BUCKET).upload(key, file, {
    cacheControl: "3600", upsert: false, contentType: file.type,
  });
  if (error) throw error;
  return supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(key).data.publicUrl;
}

export async function removePublicImage(publicUrl: string) {
  const marker = `/storage/v1/object/public/${PUBLIC_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return;
  const key = publicUrl.slice(idx + marker.length);
  await supabase.storage.from(PUBLIC_BUCKET).remove([key]);
}