import { NextRequest, NextResponse } from "next/server";
import { getUser, createServiceSupabaseClient } from "@/lib/supabase/server";
import {
  uploadPhotoToBunny,
  createBunnyStoryVideo,
  getBunnyStoryTusCredentials,
  getBunnyStoryStreamUrls,
} from "@/lib/utils/bunny";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/stories/init
//
// Video: JSON body { mediaType:"video", caption, clipStart, clipEnd }
//   → creates Bunny video, inserts DB placeholder (is_processing=true)
//   → returns { storyId, uploadType:"tus", videoId, tusEndpoint, expireTime, signature, libraryId }
//   → client uploads file directly to Bunny via TUS, then calls /api/stories/complete
//
// Photo: FormData body { file, mediaType:"photo", caption }
//   → uploads to Bunny storage, inserts DB record (is_processing=false)
//   → returns { storyId, uploadType:"done" }

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

    const contentType = req.headers.get("content-type") ?? "";
    const expiresAt   = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // ── PHOTO — FormData ───────────────────────────────────────────────────
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file     = formData.get("file") as File | null;
      const caption  = (formData.get("caption")  as string) || null;
      const ctaType      = (formData.get("ctaType")      as string) || null;
      const ctaMessage   = (formData.get("ctaMessage")   as string) || null;
      const ctaPositionY = parseFloat(formData.get("ctaPositionY") as string) || 0.75;
      const displayOrder = parseInt(formData.get("displayOrder") as string) || 0;
      console.log("[stories/init] photo ctaType:", ctaType, "ctaMessage:", ctaMessage);

      if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

      const MAX_IMAGE = 50 * 1024 * 1024;
      if (file.size > MAX_IMAGE) {
        return NextResponse.json({ error: "Image too large (max 50MB)" }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const { url } = await uploadPhotoToBunny(buffer, user.id, file.name, file.type);

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
          cta_type:       ctaType      ?? null,
          cta_message:    ctaMessage   ?? null,
          cta_position_y: ctaPositionY ?? 0.75,
          display_order:  displayOrder,
        })
        .select("id")
        .single();

      if (insertErr || !story) {
        return NextResponse.json({ error: "Failed to save story" }, { status: 500 });
      }

      return NextResponse.json({ storyId: story.id, uploadType: "done" });
    }

    // ── VIDEO — JSON, TUS ──────────────────────────────────────────────────
    const body      = await req.json();
    const mediaType = body.mediaType as string;
    const caption   = (body.caption  as string) || null;
    const ctaType      = (body.ctaType      as string) || null;
    const ctaMessage   = (body.ctaMessage   as string) || null;
    const ctaPositionY = parseFloat(body.ctaPositionY) || 0.75;
    const displayOrder = parseInt(body.displayOrder) ?? 0;
    console.log("[stories/init] video ctaType:", ctaType, "ctaMessage:", ctaMessage);
    const clipStart = parseFloat(body.clipStart) || 0;
    const clipEnd   = parseFloat(body.clipEnd)   || 0;

    if (mediaType !== "video") {
      return NextResponse.json({ error: "Invalid mediaType" }, { status: 400 });
    }

    const videoId                                    = await createBunnyStoryVideo(`story-${user.id}-${Date.now()}`);
    const { hlsUrl, thumbnailUrl }                   = getBunnyStoryStreamUrls(videoId);
    const { tusEndpoint, expireTime, signature, libraryId } = getBunnyStoryTusCredentials(videoId);

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
        cta_type:       ctaType      ?? null,
          cta_message:    ctaMessage   ?? null,
          cta_position_y: ctaPositionY ?? 0.75,
          display_order:  displayOrder,
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
      tusEndpoint,
      expireTime,
      signature,
      libraryId,
    });

  } catch (err) {
    console.error("[POST /api/stories/init] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}