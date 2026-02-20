import { createClient } from "@/lib/supabase/client";

type ImageType = "avatar" | "banner";

export async function uploadImage(
  blob: Blob,
  type: ImageType,
  userId: string
): Promise<string> {
  const supabase = createClient();

  const bucket = type === "avatar" ? "avatars" : "banners";
  const ext = "jpg";
  const path = `${userId}.${ext}`;

  console.log("Uploading blob:", { size: blob.size, type: blob.type, bucket, path });
  console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);

  if (!blob || blob.size === 0) {
    throw new Error("Blob is empty — crop failed to produce an image");
  }

  // Convert blob to ArrayBuffer to avoid fetch issues with Blob in some browsers
  const arrayBuffer = await blob.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  console.log("ArrayBuffer size:", uint8Array.length);

  const { error, data: uploadData } = await supabase.storage
    .from(bucket)
    .upload(path, uint8Array, {
      contentType: "image/jpeg",
      upsert: true,
    });

  console.log("Upload result:", { uploadData, error });

  if (error) {
    console.error("Storage upload error full:", error);
    console.error("Storage upload error JSON:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);

  // Bust cache by appending timestamp
  return `${data.publicUrl}?t=${Date.now()}`;
}