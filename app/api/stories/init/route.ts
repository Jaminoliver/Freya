import { NextRequest, NextResponse } from "next/server";
import { getUser, createServiceSupabaseClient } from "@/lib/supabase/server";
import {
  createBunnyStoryVideo,
  getBunnyStoryTusCredentials,
  uploadPhotoToBunny,
  getBunnyStoryStreamUrls,
} from "@/lib/utils/bunny";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/stories/init
export async function POST(req: NextRequest) {
  try {
    const { user, error: authErr } = await getUser();
    if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createServiceSupabaseClient();

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "creator") {
      return NextResponse.json({ error: "Only creators can post stories" }, { status: 403 });
    }

    const body      = await req.json();
    const mediaType = body.mediaType as "photo" | "video";
    const caption   = (body.caption  as string) || null;
    const clipStart = parseFloat(body.clipStart) || 0;
    const clipEnd   = parseFloat(body.clipEnd)   || 0;
    const fileName  = (body.fileName  as string) || "story";
    const mimeType  = (body.mimeType  as string) || "video/mp4";
    const fileData  = (body.fileData  as string) || null;

    if (!["photo", "video"].includes(mediaType)) {
      return NextResponse.json({ error: "Invalid mediaType" }, { status: 400 });
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // ── PHOTO ─────────────────────────────────────────────────────────────
    if (mediaType === "photo") {
      if (!fileData) return NextResponse.json({ error: "No fileData for photo" }, { status: 400 });

      const buffer = Buffer.from(fileData, "base64");
      const { url } = await uploadPhotoToBunny(buffer, user.id, fileName, mimeType);

      const { data: story, error: insertErr } = await supabase
        .from("stories")
        .insert({
          creator_id:    user.id,
          media_type:    "photo",
          media_url:     url,
          thumbnail_url: null,
          caption,
          clip_start:    null,
          clip_end:      null,
          expires_at:    expiresAt,
          is_expired:    false,
          is_processing: false,
        })
        .select("id")
        .single();

      if (insertErr || !story) {
        return NextResponse.json({ error: "Failed to save story" }, { status: 500 });
      }

      return NextResponse.json({ storyId: story.id, uploadType: "done" });
    }

    // ── VIDEO ─────────────────────────────────────────────────────────────
    const videoId = await createBunnyStoryVideo(`story-${user.id}-${Date.now()}`);
    const { hlsUrl, thumbnailUrl } = getBunnyStoryStreamUrls(videoId);
    const tus = getBunnyStoryTusCredentials(videoId);

    const { data: story, error: insertErr } = await supabase
      .from("stories")
      .insert({
        creator_id:     user.id,
        media_type:     "video",
        media_url:      hlsUrl,
        thumbnail_url:  thumbnailUrl,
        caption,
        clip_start:     clipStart > 0 ? clipStart : null,
        clip_end:       clipEnd   > 0 ? clipEnd   : null,
        expires_at:     expiresAt,
        is_expired:     false,
        is_processing:  true,
        bunny_video_id: videoId,
      })
      .select("id")
      .single();

    if (insertErr || !story) {
      console.error("[POST /api/stories/init] insert error:", insertErr);
      return NextResponse.json({ error: "Failed to create story" }, { status: 500 });
    }

    return NextResponse.json({
      storyId:     story.id,
      uploadType:  "tus",
      videoId,
      tusEndpoint: tus.tusEndpoint,
      signature:   tus.signature,
      expireTime:  tus.expireTime,
      libraryId:   tus.libraryId,
    });

  } catch (err) {
    console.error("[POST /api/stories/init] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}