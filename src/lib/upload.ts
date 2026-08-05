import { supabase } from "./supabase";

/**
 * Image लाई Browser भित्रै WebP मा कम्प्रेस गर्ने Helper Function
 */
async function compressImageToWebp(
  file: File,
  maxWidth = 1200,
  quality = 0.75
): Promise<File> {
  return new Promise((resolve, reject) => {
    // यदि फाइल पहिले नै साना छ भने सिधै अगाडि बढाउने
    if (file.size < 200 * 1024) {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // यदि चौडाइ maxWidth भन्दा धेरै छ भने अनुपात मिलाएर घटाउने
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas context नपाएको कारण असफल भयो।"));

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error("Image compress गर्दा त्रुटि आयो।"));
            
            // नयाँ WebP फाइल बनाउने
            const compressedFile = new File(
              [blob],
              file.name.replace(/\.[^/.]+$/, "") + ".webp",
              { type: "image/webp" }
            );
            resolve(compressedFile);
          },
          "image/webp",
          quality
        );
      };

      img.onerror = (err) => reject(err);
    };

    reader.onerror = (err) => reject(err);
  });
}

/**
 * Public Storage Bucket मा फोटो अपलोड गर्ने मुख्य Function
 */
export async function uploadPublicImage(
  file: File,
  bucket = "proofs"
): Promise<string> {
  try {
    // १. पहिले फोटोलाई WebP मा कम्प्रेस गर्ने (Page Size घटाउन)
    const compressedFile = await compressImageToWebp(file, 1200, 0.75);

    // २. युनिक नाम सिर्जना गर्ने
    const fileExt = "webp";
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

    // ३. Supabase Storage मा अपलोड गर्ने
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, compressedFile, {
        contentType: "image/webp",
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase Storage Upload Error:", uploadError);
      throw uploadError;
    }

    // ४. अपलोड भएको फोटोको Public URL लिने
    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);

    if (!data.publicUrl) {
      throw new Error("Public URL पाउन सकिएन।");
    }

    return data.publicUrl;
  } catch (error) {
    console.error("Image Upload Error:", error);
    throw error;
  }
}
