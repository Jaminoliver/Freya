import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";
import { createBunnyVideo, uploadVideoToBunny, getBunnyStreamUrls } from "@/lib/utils/bunny";

const MAX_SIZE_BYTES = 2 * 1024 * 1024 * 1024; // 2GB
const ALLOWED_TYPES  = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/webm", "video/mpeg"];

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "2gb",
    },
    responseLimit: false,
  },
};

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file     = formData.get("file") as File | null;
    const title    = (formData.get("title") as string) || file?.name || "Untitled";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: MP4, MOV, AVI, WebM, MPEG" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 2GB" },
        { status: 400 }
      );
    }

    // Step 1: Create video object in Bunny Stream
    const videoId = await createBunnyVideo(title);

    // Step 2: Upload video buffer to Bunny Stream
    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadVideoToBunny(buffer, videoId);

    // Step 3: Get playback URLs
    const { hlsUrl, thumbnailUrl } = getBunnyStreamUrls(videoId);

    // Step 4: Save to media table with processing status
    const service = createServiceSupabaseClient();
    const { data: mediaRow, error: insertError } = await service
      .from("media")
      .insert({
        creator_id:        user.id,
        media_type:        "video",
        file_url:          hlsUrl,
        thumbnail_url:     thumbnailUrl,
        mime_type:         file.type,
        file_size_bytes:   file.size,
        processing_status: "processing",
        bunny_video_id:    videoId,
        is_watermarked:    false,
      })
      .select("id, file_url, thumbnail_url, bunny_video_id")
      .single();

    if (insertError) {
      console.error("[Upload Video] DB insert error:", insertError.message);
      return NextResponse.json({ error: "Upload succeeded but failed to save record" }, { status: 500 });
    }

    return NextResponse.json({
      success:      true,
      mediaId:      mediaRow.id,
      videoId:      mediaRow.bunny_video_id,
      url:          mediaRow.file_url,
      thumbnailUrl: mediaRow.thumbnail_url,
      status:       "processing",
    });

  } catch (err) {
    console.error("[Upload Video] Error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}