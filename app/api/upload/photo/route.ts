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
    const file     = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 50MB" },
        { status: 400 }
      );
    }

    const buffer   = Buffer.from(await file.arrayBuffer());
    const isGif    = file.type === "image/gif";
    const mediaType = isGif ? "gif" : "photo";

    const { url, path } = await uploadPhotoToBunny(
      buffer,
      user.id,
      file.name,
      file.type
    );

    // Save to media table
    const service = createServiceSupabaseClient();
    const { data: mediaRow, error: insertError } = await service
      .from("media")
      .insert({
        creator_id:         user.id,
        media_type:         mediaType,
        file_url:           url,
        mime_type:          file.type,
        file_size_bytes:    file.size,
        processing_status:  "completed",
        is_watermarked:     false,
      })
      .select("id, file_url, media_type")
      .single();

    if (insertError) {
      console.error("[Upload Photo] DB insert error:", insertError.message);
      return NextResponse.json({ error: "Upload succeeded but failed to save record" }, { status: 500 });
    }

    return NextResponse.json({
      success:   true,
      mediaId:   mediaRow.id,
      url:       mediaRow.file_url,
      mediaType: mediaRow.media_type,
      path,
    });

  } catch (err) {
    console.error("[Upload Photo] Error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}