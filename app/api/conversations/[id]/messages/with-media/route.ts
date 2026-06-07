import { NextResponse } from "next/server";
import { createServerSupabaseClient, getUser } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { user, error: authError } = await getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const conversationId = parseInt(id, 10);
  if (isNaN(conversationId)) return NextResponse.json({ error: "Invalid conversation id" }, { status: 400 });

  const { content, mediaIds, is_ppv, ppv_price } = await request.json() as {
    content?:   string | null;
    mediaIds:   number[];
    is_ppv?:    boolean;
    ppv_price?: number;
  };

  if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
    return NextResponse.json({ error: "mediaIds required" }, { status: 400 });
  }

  // PPV requires creator role + valid price
  if (is_ppv) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!profile || profile.role !== "creator") {
      return NextResponse.json({ error: "Only creators can send PPV messages" }, { status: 403 });
    }
    if (!ppv_price || ppv_price <= 0) {
      return NextResponse.json({ error: "Invalid price" }, { status: 400 });
    }
  }

  const { data: convo } = await supabase
    .from("conversations")
    .select("id, creator_id, fan_id, is_blocked")
    .eq("id", conversationId)
    .or(`creator_id.eq.${user.id},fan_id.eq.${user.id}`)
    .single();

  if (!convo)           return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (convo.is_blocked) return NextResponse.json({ error: "Conversation is blocked" }, { status: 403 });

  // Look up the media rows uploaded earlier — restricted to user's own
  const { data: mediaRows, error: mediaError } = await supabase
    .from("media")
    .select("id, file_url, thumbnail_url, media_type, bunny_video_id, processing_status, raw_video_url")
    .in("id", mediaIds)
    .eq("creator_id", user.id);

  if (mediaError || !mediaRows || mediaRows.length === 0) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  // Preserve original order requested by client
  const orderedMedia = mediaIds
    .map((mid) => mediaRows.find((m) => m.id === mid))
    .filter(Boolean) as typeof mediaRows;

  if (orderedMedia.length === 0) {
    return NextResponse.json({ error: "No accessible media" }, { status: 404 });
  }

  const receiverId     = convo.creator_id === user.id ? convo.fan_id : convo.creator_id;
  const firstMediaType = orderedMedia[0].media_type === "video" ? "video" : "photo";
  const trimmedContent = content?.trim() || null;
  const thumbnailUrl   = orderedMedia[0].thumbnail_url || orderedMedia[0].file_url;

  // Insert message — for PPV mark unlocked=false; for non-PPV unlocked=true
  const { data: message, error: insertError } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id:       user.id,
      receiver_id:     receiverId,
      content:         trimmedContent,
      is_ppv:          !!is_ppv,
      ppv_price:       is_ppv ? ppv_price : null,
      is_unlocked:     !is_ppv,
      media_type:      firstMediaType,
      media_url:       orderedMedia[0].file_url,
      thumbnail_url:   thumbnailUrl,
    })
    .select("id, conversation_id, sender_id, content, created_at, is_read")
    .single();

  if (insertError || !message) {
    console.error("[messages/with-media] insert error:", insertError);
    return NextResponse.json({ error: insertError?.message ?? "Insert failed" }, { status: 500 });
  }

  // Insert message_media rows
  const mediaInsertRows = orderedMedia.map((m, i) => ({
    message_id:        message.id,
    url:               m.file_url,
    thumbnail_url:     m.thumbnail_url,
    media_type:        m.media_type === "video" ? "video" : "photo",
    display_order:     i,
    processing_status: m.processing_status ?? null,
    bunny_video_id:    m.bunny_video_id ?? null,
    raw_video_url:     m.raw_video_url ?? null,
  }));

  const { error: mmError } = await supabase.from("message_media").insert(mediaInsertRows);
  if (mmError) {
    console.error("[messages/with-media] message_media insert error:", mmError);
    await supabase.from("messages").delete().eq("id", message.id);
    return NextResponse.json({ error: "Media link failed" }, { status: 500 });
  }

  // Increment unread count + update conversation metadata
  if (!is_ppv) {
    const isCreatorSending = convo.creator_id === user.id;
    const unreadField      = isCreatorSending ? "unread_count_fan" : "unread_count_creator";
    await supabase.rpc("increment_unread_count", {
      p_conversation_id: conversationId,
      p_field:           unreadField,
    });
  }

  await supabase
    .from("conversations")
    .update({
      last_message_preview: is_ppv ? "🔒 PPV message" : (trimmedContent ?? "📷 Media"),
      last_message_at:      message.created_at,
      updated_at:           new Date().toISOString(),
    })
    .eq("id", conversationId);

  return NextResponse.json({
    message: {
      id:             message.id,
      conversationId: message.conversation_id,
      senderId:       message.sender_id,
      type:           is_ppv ? "ppv" : "media",
      text:           message.content ?? undefined,
      mediaUrls:      orderedMedia.map((m) => m.file_url),
      thumbnailUrl:   orderedMedia[0].thumbnail_url ?? null,
      createdAt:      message.created_at,
      isRead:         message.is_read ?? false,
      ...(is_ppv ? {
        ppv: {
          price:         ppv_price!,
          isUnlocked:    false,
          unlockedCount: 0,
        },
      } : {}),
    },
  }, { status: 201 });
}