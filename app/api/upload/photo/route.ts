import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";
import { uploadPhotoToBunny } from "@/lib/utils/bunny";
import sharp from "sharp";
import { encode } from "blurhash";

const MAX_SIZE_BYTES = 50 * 1024 * 1024;
const ALLOWED_TYPES  = ["image/jpeg", "image/png", "image/webp", "image/gif"];

async function generateBlurHash(buffer: Buffer): Promise<string | null> {
  try {
    const { data, info } = await sharp(buffer)
      .resize(20, 20, { fit: "inside" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    return encode(
      new Uint8ClampedArray(data),
      info.width,
      info.height,
      4,
      4,
    );
  } catch {
    return null;
  }
}

async function generateThumbnail(buffer: Buffer, mimeType: string): Promise<Buffer | null> {
  try {
    return await sharp(buffer)
      .resize(400, 400, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toBuffer();
  } catch {
    return null;
  }
}

async function getImageDimensions(buffer: Buffer): Promise<{ width: number; height: number } | null> {
  try {
    const meta = await sharp(buffer).metadata();
    if (!meta.width || !meta.height) return null;
    return { width: meta.width, height: meta.height };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const files     = formData.getAll("file") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const service = createServiceSupabaseClient();
    const results = [];
    const errors  = [];

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push({ name: file.name, error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF" });
        continue;
      }

      if (file.size > MAX_SIZE_BYTES) {
        errors.push({ name: file.name, error: "File too large. Maximum size is 50MB" });
        continue;
      }

      try {
        const buffer    = Buffer.from(await file.arrayBuffer());
        const isGif     = file.type === "image/gif";
        const mediaType = isGif ? "gif" : "photo";

        console.log(`[Upload Photo] Processing file: ${file.name} (${file.type}, ${file.size} bytes)`);

        // Generate blurhash, thumbnail, dimensions, and upload in parallel
        const [{ url, path }, blurHash, thumbnailBuffer, dimensions] = await Promise.all([
          uploadPhotoToBunny(buffer, user.id, file.name, file.type),
          isGif ? Promise.resolve(null) : generateBlurHash(buffer),
          isGif ? Promise.resolve(null) : generateThumbnail(buffer, file.type),
          isGif ? Promise.resolve(null) : getImageDimensions(buffer),
        ]);

        console.log(`[Upload Photo] file_url: ${url}`);
        console.log(`[Upload Photo] blur_hash: ${blurHash ?? "null"}`);

        // Upload thumbnail to Bunny
        let thumbnailUrl: string | null = null;
        if (thumbnailBuffer) {
          try {
            const thumbFileName = file.name.replace(/\.[^.]+$/, "_thumb.jpg");
            const { url: thumbUrl } = await uploadPhotoToBunny(thumbnailBuffer, user.id, thumbFileName, "image/jpeg");
            thumbnailUrl = thumbUrl;
            console.log(`[Upload Photo] thumbnail_url: ${thumbnailUrl}`);
          } catch (thumbErr) {
            console.warn(`[Upload Photo] Thumbnail upload failed (non-fatal):`, thumbErr);
          }
        } else {
          console.log(`[Upload Photo] thumbnail_url: null (skipped for GIF or failed)`);
        }

        const { data: mediaRow, error: insertError } = await service
          .from("media")
          .insert({
            creator_id:        user.id,
            media_type:        mediaType,
            file_url:          url,
            thumbnail_url:     thumbnailUrl,
            mime_type:         file.type,
            file_size_bytes:   file.size,
            processing_status: "completed",
            is_watermarked:    false,
            blur_hash:         blurHash ?? null,
            width:             dimensions?.width ?? null,
            height:            dimensions?.height ?? null,
            aspect_ratio:      dimensions ? dimensions.width / dimensions.height : null,
          })
          .select("id, file_url, thumbnail_url, blur_hash, media_type, width, height")
          .single();

        if (insertError) {
          console.error("[Upload Photo] DB insert error:", insertError.message);
          errors.push({ name: file.name, error: "Upload succeeded but failed to save record" });
          continue;
        }

        console.log(`[Upload Photo] ✅ Saved to DB — mediaId: ${mediaRow.id}, thumbnail_url: ${mediaRow.thumbnail_url ?? "null"}, blur_hash: ${mediaRow.blur_hash ?? "null"}, dimensions: ${mediaRow.width}x${mediaRow.height}`);

        results.push({
          mediaId:   mediaRow.id,
          url:       mediaRow.file_url,
          mediaType: mediaRow.media_type,
          path,
        });
      } catch (err) {
        console.error("[Upload Photo] File error:", err);
        errors.push({ name: file.name, error: "Upload failed" });
      }
    }

    if (results.length === 0) {
      return NextResponse.json({ error: "All uploads failed", errors }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      results,
      ...(errors.length > 0 && { partialErrors: errors }),
    });

  } catch (err) {
    console.error("[Upload Photo] Error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}