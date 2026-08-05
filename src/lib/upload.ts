import { supabase } from "./supabase";

interface UploadOptions {
  bucket?: string;
  folder?: string;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

/**
 * Helper to compress and resize images using browser Canvas before upload
 */
async function compressImage(
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.8
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
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Canvas to blob conversion failed"));
          }
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = (err) => reject(err);
  });
}

/**
 * Uploads a public image to Supabase Storage with optional compression and custom folder paths
 */
export async function uploadPublicImage(
  file: File,
  bucket = "avatars",
  options: UploadOptions = {}
): Promise<string> {
  try {
    const {
      folder = "",
      maxWidth = 1200,
      maxHeight = 1200,
      quality = 0.8,
    } = options;

    // 1. Compress Image if it's an image file
    let uploadData: Blob | File = file;
    if (file.type.startsWith("image/")) {
      try {
        uploadData = await compressImage(file, maxWidth, maxHeight, quality);
      } catch (e) {
        console.warn("Image compression failed, using original file:", e);
      }
    }

    // 2. Generate unique file path
    const fileExt = file.name.split(".").pop() || "jpg";
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = folder ? `${folder.replace(/\/$/, "")}/${fileName}` : fileName;

    // 3. Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, uploadData, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type.startsWith("image/") ? "image/jpeg" : file.type,
      });

    if (uploadError) {
      throw uploadError;
    }

    // 4. Get Public URL
    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    if (!data?.publicUrl) {
      throw new Error("Failed to generate public URL for uploaded file");
    }

    return data.publicUrl;
  } catch (err) {
    console.error("Error uploading image:", err);
    throw err;
  }
}

/**
 * Removes a public image from Supabase Storage using its full URL
 */
export async function removePublicImage(
  url: string,
  bucket = "avatars"
): Promise<boolean> {
  if (!url) return false;

  try {
    // Extract file path from public URL
    const urlParts = url.split(`${bucket}/`);
    if (urlParts.length < 2) {
      // Fallback: get last segment
      const fileName = url.split("/").pop();
      if (!fileName) return false;
      const { error } = await supabase.storage.from(bucket).remove([fileName]);
      return !error;
    }

    const filePath = urlParts[1];
    const { error } = await supabase.storage.from(bucket).remove([filePath]);

    if (error) {
      console.error("Supabase storage delete error:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Failed to remove public image:", err);
    return false;
  }
}
