// app/api/messages/ppv/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";
import { signBunnyUrl } from "@/lib/utils/bunny";

const STREAM_CDN = process.env.BUNNY_STREAM_CDN_HOSTNAME ?? "vz-8bc100f4-3c0.b-cdn.net";

function extractBunnyPath(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.pathname;
  } catch {
    return url.startsWith("/") ? url : `/${url}`;
  }
}

function extractBunnyVideoId(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/\/play\/\d+\/([a-f0-9-]{36})\/playlist\.m3u8/i);
  return match ? match[1] : null;
}

// GET /api/messages/ppv/[id]
// Returns a PPV message in a shape compatible with the single-post page.
// Access: only the sender or a fan with a matching ppv_message_unlocks row.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const messageId = parseInt(id, 10);
  if (isNaN(messageId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const service = createServiceSupabaseClient();

  const { data: row, error } = await service
    .from("messages")
    .select(`
      id,
      conversation_id,
      sender_id,
      content,
      is_ppv,
      ppv_price,
      media_type,
      media_url,
      thumbnail_url,
      is_deleted,
      created_at,
      profiles:profiles!messages_sender_id_fkey (
        id,
        username,
        display_name,
        avatar_url,
        is_verified
      ),
      message_media (
        id,
        url,
        thumbnail_url,
        media_type,
        display_order
      )
    `)
    .eq("id", messageId)
    .single();

  if (error || !row) return NextResponse.json({ error: "Message not found" }, { status: 404 });
  if (!row.is_ppv)   return NextResponse.json({ error: "Not a PPV message" }, { status: 400 });

  const isSender = row.sender_id === user.id;

  let hasUnlock = false;
  if (!isSender) {
    const { data: unlock } = await service
      .from("ppv_message_unlocks")
      .select("id")
      .eq("message_id", messageId)
      .eq("fan_id", user.id)
      .maybeSingle();
    hasUnlock = !!unlock;
  }

  if (!isSender && !hasUnlock) {
    return NextResponse.json({ error: "Not unlocked" }, { status: 403 });
  }

  // Build media list
  const mediaRows = (row.message_media ?? []).sort(
    (a: any, b: any) => a.display_order - b.display_order
  );
  const baseMedia = mediaRows.length > 0
    ? mediaRows.map((m: any) => ({ url: m.url, thumbnail_url: m.thumbnail_url, media_type: m.media_type }))
    : row.media_url
      ? [{ url: row.media_url, thumbnail_url: row.thumbnail_url, media_type: row.media_type }]
      : [];

  const profile = row.profiles as any;

  const media = baseMedia.map((m: any, i: number) => {
    const mediaType = m.media_type === "video" ? "video" : "image";
    const path      = extractBunnyPath(m.url ?? null);
    const fileUrl   = path ? signBunnyUrl(path) : (m.url ?? null);
    let thumbUrl: string | null = null;
    let bunnyVideoId: string | null = null;
    if (mediaType === "video") {
      bunnyVideoId = extractBunnyVideoId(m.url ?? null);
      const storedPath = extractBunnyPath(m.thumbnail_url ?? null);
      thumbUrl = storedPath
        ? signBunnyUrl(storedPath)
        : bunnyVideoId
          ? `https://${STREAM_CDN}/${bunnyVideoId}/thumbnail.jpg`
          : null;
    } else {
      const storedPath = extractBunnyPath(m.thumbnail_url ?? null);
      thumbUrl = storedPath ? signBunnyUrl(storedPath) : fileUrl;
    }
    return {
      id:                i + 1,
      media_type:        mediaType,
      file_url:          fileUrl,
      thumbnail_url:     thumbUrl,
      raw_video_url:     null,
      bunny_video_id:    bunnyVideoId,
      processing_status: null,
      duration_seconds:  null,
      locked:            false,
      display_order:     i,
      blur_hash:         null,
      width:             null,
      height:            null,
    };
  });

  return NextResponse.json({
    message: {
      id:              row.id,
      conversation_id: row.conversation_id,
      sender_id:       row.sender_id,
      content:         row.content ?? null,
      ppv_price:       row.ppv_price ?? 0,
      created_at:      row.created_at,
      is_deleted:      !!row.is_deleted,
      profiles: {
        username:     profile?.username ?? "",
        display_name: profile?.display_name ?? null,
        avatar_url:   profile?.avatar_url ?? null,
        is_verified:  !!profile?.is_verified,
      },
      media,
    },
  });
}