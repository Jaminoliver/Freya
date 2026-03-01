import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";
import { uploadPhotoToBunny } from "@/lib/utils/bunny";

const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES  = ["image/jpeg", "image/png", "image/webp", "image/gif"];

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

        const { url, path } = await uploadPhotoToBunny(
          buffer,
          user.id,
          file.name,
          file.type
        );

        const { data: mediaRow, error: insertError } = await service
          .from("media")
          .insert({
            creator_id:        user.id,
            media_type:        mediaType,
            file_url:          url,
            mime_type:         file.type,
            file_size_bytes:   file.size,
            processing_status: "completed",
            is_watermarked:    false,
          })
          .select("id, file_url, media_type")
          .single();

        if (insertError) {
          console.error("[Upload Photo] DB insert error:", insertError.message);
          errors.push({ name: file.name, error: "Upload succeeded but failed to save record" });
          continue;
        }

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