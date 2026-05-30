import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUNNY_STORAGE_ZONE    = process.env.BUNNY_STORAGE_ZONE!;
const BUNNY_STORAGE_API_KEY = process.env.BUNNY_STORAGE_API_KEY!;
const BUNNY_STORAGE_HOST    = process.env.BUNNY_STORAGE_HOST ?? "storage.bunnycdn.com";
const BUNNY_STREAM_LIBRARY  = process.env.BUNNY_STREAM_LIBRARY_ID!;
const BUNNY_STREAM_API_KEY  = process.env.BUNNY_STREAM_API_KEY!;

// How old an orphan must be before we delete it (avoid deleting in-flight uploads)
const ORPHAN_AGE_MINUTES = 15;

async function deleteBunnyFile(url: string) {
  try {
    const cleanUrl  = url.split("#")[0];
    const filePath  = new URL(cleanUrl).pathname;
    // Strip the storage zone prefix if present
    const path = filePath.startsWith(`/${BUNNY_STORAGE_ZONE}`)
      ? filePath.slice(`/${BUNNY_STORAGE_ZONE}`.length)
      : filePath;
    await fetch(`https://${BUNNY_STORAGE_HOST}/${BUNNY_STORAGE_ZONE}${path}`, {
      method:  "DELETE",
      headers: { AccessKey: BUNNY_STORAGE_API_KEY },
    });
  } catch {}
}

async function deleteBunnyVideo(videoId: string) {
  try {
    await fetch(
      `https://video.bunnycdn.com/library/${BUNNY_STREAM_LIBRARY}/videos/${videoId}`,
      { method: "DELETE", headers: { AccessKey: BUNNY_STREAM_API_KEY } }
    );
  } catch {}
}

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - ORPHAN_AGE_MINUTES * 60 * 1000).toISOString();
  let deletedMessages = 0;
  let deletedPosts    = 0;

  // ── 1. Orphaned message media ─────────────────────────────────────────────
  // Messages older than cutoff with media_url = null (upload never completed)
  const { data: orphanedMessages } = await service
    .from("messages")
    .select("id, created_at")
    .is("media_url", null)
    .not("media_type", "is", null)
    .lt("created_at", cutoff);

  if (orphanedMessages && orphanedMessages.length > 0) {
    const messageIds = orphanedMessages.map((m) => m.id);

    // Get any message_media rows that were partially inserted
    const { data: orphanedMedia } = await service
      .from("message_media")
      .select("id, url, message_id")
      .in("message_id", messageIds);

    if (orphanedMedia && orphanedMedia.length > 0) {
      await Promise.allSettled(orphanedMedia.map(({ url }) => deleteBunnyFile(url)));
    }

    // Delete the message rows — cascades to message_media
    await service.from("messages").delete().in("id", messageIds);
    deletedMessages = orphanedMessages.length;
  }

  // ── 2. Orphaned post media ────────────────────────────────────────────────
  // media rows with no post_id (upload started but post was never saved)
  // OR media rows where post_id references a deleted post (orphaned by cascade miss)
  const { data: orphanedPostMedia } = await service
    .from("media")
    .select("id, file_url, bunny_video_id, post_id, processing_status, created_at")
    .is("post_id", null)
    .lt("created_at", cutoff);

  if (orphanedPostMedia && orphanedPostMedia.length > 0) {
    await Promise.allSettled(
      orphanedPostMedia.map(async ({ file_url, bunny_video_id }) => {
        if (bunny_video_id) {
          await deleteBunnyVideo(bunny_video_id);
        } else if (file_url) {
          await deleteBunnyFile(file_url);
        }
      })
    );

    const mediaIds = orphanedPostMedia.map((m) => m.id);
    await service.from("media").delete().in("id", mediaIds);
    deletedPosts = orphanedPostMedia.length;
  }

  console.log(`[cleanup] messages=${deletedMessages} post_media=${deletedPosts}`);

  return NextResponse.json({
    ok: true,
    deletedMessages,
    deletedPostMedia: deletedPosts,
  });
}