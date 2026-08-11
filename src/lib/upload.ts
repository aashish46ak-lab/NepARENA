import { supabase } from "./supabase";

interface UploadOptions {
  bucket?: string;
  folder?: string;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

async function compressImage(
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.8,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      let width = img.width;
      let height = img.height;
      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context for compression"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas to blob conversion failed"));
        },
        "image/jpeg",
        quality,
      );
    };
    img.onerror = (err) => reject(err);
  });
}

const BUCKET_CANDIDATES = ["avatars", "public", "images", "media", "uploads"];

/**
 * Upload public media. Tries several buckets so "Bucket not found" is rare.
 * Call styles supported:
 *   uploadPublicImage(file)
 *   uploadPublicImage(file, "avatars", { folder: "messages" })
 *   uploadPublicImage(file, "messages") // folder-only (chat)
 */
export async function uploadPublicImage(
  file: File,
  bucketOrFolder?: string,
  options: UploadOptions = {},
): Promise<string> {
  let preferredBucket = options.bucket ?? "avatars";
  let folder = options.folder ?? "";

  if (bucketOrFolder) {
    if (BUCKET_CANDIDATES.includes(bucketOrFolder) || options.folder !== undefined) {
      preferredBucket = bucketOrFolder;
    } else {
      folder = bucketOrFolder;
    }
  }

  const { maxWidth = 1200, maxHeight = 1200, quality = 0.8 } = options;

  let uploadData: Blob | File = file;
  if (file.type.startsWith("image/")) {
    try {
      uploadData = await compressImage(file, maxWidth, maxHeight, quality);
    } catch (e) {
      console.warn("Image compression failed, using original:", e);
    }
  }

  const fileExt =
    (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") ||
    "jpg";
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${fileExt}`;
  const filePath = folder ? `${folder.replace(/\/$/, "")}/${fileName}` : fileName;

  const tryBuckets = [
    preferredBucket,
    ...BUCKET_CANDIDATES.filter((b) => b !== preferredBucket),
  ];

  let lastError: Error | null = null;

  for (const bucket of tryBuckets) {
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, uploadData, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type.startsWith("image/")
          ? "image/jpeg"
          : file.type || "application/octet-stream",
      });

    if (!uploadError) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
      if (data?.publicUrl) return data.publicUrl;
      lastError = new Error("Failed to generate public URL");
      continue;
    }

    const msg = uploadError.message || "";
    if (
      /bucket not found|not found|does not exist/i.test(msg) ||
      (uploadError as { statusCode?: string }).statusCode === "404"
    ) {
      lastError = uploadError;
      continue;
    }
    throw uploadError;
  }

  throw (
    lastError ??
    new Error(
      "Upload failed: create a public Storage bucket named 'avatars' in Supabase.",
    )
  );
}

export async function removePublicImage(
  url: string,
  bucket = "avatars",
): Promise<boolean> {
  if (!url) return false;
  try {
    for (const b of [bucket, ...BUCKET_CANDIDATES]) {
      const urlParts = url.split(`${b}/`);
      if (urlParts.length >= 2) {
        const { error } = await supabase.storage.from(b).remove([urlParts[1]]);
        if (!error) return true;
      }
    }
    const fileName = url.split("/").pop();
    if (!fileName) return false;
    const { error } = await supabase.storage.from(bucket).remove([fileName]);
    return !error;
  } catch {
    return false;
  }
}
