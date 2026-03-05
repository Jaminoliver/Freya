import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";
import { getBunnyStreamUrls, getBunnyRawVideoUrl } from "@/lib/utils/bunny";
import sharp from "sharp";
import { encode } from "blurhash";

async function generateBlurHashFromUrl(url: string): Promise<string | null> {
  try {
    const res    = await fetch(url);
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());

    const { data, info } = await sharp(buffer)
      .resize(20, 20, { fit: "inside" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    return encode(new Uint8ClampedArray(data), info.width, info.height, 4, 4);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { videoId, mimeType, fileSizeBytes, customThumbnailUrl } = await req.json();

    if (!videoId) {
      return NextResponse.json({ error: "videoId is required" }, { status: 400 });
    }

    const { hlsUrl, thumbnailUrl } = getBunnyStreamUrls(videoId);
    const rawVideoUrl              = getBunnyRawVideoUrl(videoId);
    const finalThumbnailUrl        = customThumbnailUrl || thumbnailUrl;

    // Generate blurhash from thumbnail in parallel with DB insert prep
    const blurHash = await generateBlurHashFromUrl(finalThumbnailUrl);

    const service = createServiceSupabaseClient();
    const { data: mediaRow, error: insertError } = await service
      .from("media")
      .insert({
        creator_id:        user.id,
        media_type:        "video",
        file_url:          hlsUrl,
        raw_video_url:     rawVideoUrl,
        thumbnail_url:     finalThumbnailUrl,
        mime_type:         mimeType || "video/mp4",
        file_size_bytes:   fileSizeBytes || null,
        processing_status: "processing",
        bunny_video_id:    videoId,
        is_watermarked:    false,
        blur_hash:         blurHash ?? null,
      })
      .select("id, file_url, raw_video_url, thumbnail_url, bunny_video_id")
      .single();

    if (insertError) {
      console.error("[Upload Video Complete] DB insert error:", insertError.message);
      return NextResponse.json({ error: "Failed to save record" }, { status: 500 });
    }

    return NextResponse.json({
      success:      true,
      mediaId:      mediaRow.id,
      videoId:      mediaRow.bunny_video_id,
      url:          mediaRow.file_url,
      rawVideoUrl:  mediaRow.raw_video_url,
      thumbnailUrl: mediaRow.thumbnail_url,
      status:       "processing",
    });

  } catch (err) {
    console.error("[Upload Video Complete] Error:", err);
    return NextResponse.json({ error: "Failed to complete upload" }, { status: 500 });
  }
}