import { NextResponse } from "next/server";
import { createServerSupabaseClient, getUser } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { user, error: authError } = await getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const conversationId = parseInt(id, 10);

  if (isNaN(conversationId)) {
    return NextResponse.json({ error: "Invalid conversation id" }, { status: 400 });
  }

  const { data: convo } = await supabase
    .from("conversations")
    .select("id, creator_id, fan_id, deleted_before_creator, deleted_before_fan, deleted_for_creator, deleted_for_fan")
    .eq("id", conversationId)
    .or(`creator_id.eq.${user.id},fan_id.eq.${user.id}`)
    .single();

  if (!convo) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const filter = searchParams.get("filter") ?? "all";
  const limit  = 30;

  const isCreator     = convo.creator_id === user.id;
  const deleteField   = isCreator ? "deleted_for_creator" : "deleted_for_fan";
  const deletedBefore = isCreator
    ? (convo as any).deleted_before_creator
    : (convo as any).deleted_before_fan;

  // DIAGNOSTIC: log raw media_type values to see exact format
  const { data: diagRows } = await supabase
    .from("messages")
    .select("id, media_type")
    .eq("conversation_id", conversationId)
    .not("media_type", "is", null)
    .limit(10);
  console.log("[gallery] DIAG raw media_types:", JSON.stringify(diagRows?.map((r: any) => ({ id: r.id, media_type: r.media_type }))));

  // Step 1: fetch messages that have media
  let msgsQuery = supabase
    .from("messages")
    .select("id, sender_id, is_ppv, created_at")
    .eq("conversation_id", conversationId)
    .eq(deleteField, false)
    .eq("is_deleted_for_everyone", false)
    .not("media_type", "is", null)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (filter === "images") msgsQuery = msgsQuery.eq("media_type", "photo");
  if (filter === "videos") msgsQuery = msgsQuery.ilike("media_type", "video%");
  if (cursor)              msgsQuery = msgsQuery.gt("created_at", cursor);
  if (deletedBefore)       msgsQuery = msgsQuery.gt("created_at", deletedBefore);

  const { data: msgRows, error: msgsError } = await msgsQuery;

  console.log("[gallery] filter:", filter, "| msgsError:", msgsError?.message ?? null, "| msgRows count:", msgRows?.length ?? 0);
  console.log("[gallery] msgRows sample:", JSON.stringify(msgRows?.slice(0, 3)));

  if (msgsError) {
    return NextResponse.json({ error: msgsError.message }, { status: 500 });
  }

  const msgRows_ = msgRows ?? [];
  if (msgRows_.length === 0) {
    console.log("[gallery] No messages found — returning empty");
    return NextResponse.json({ mediaItems: [], nextCursor: null });
  }

  const messageIds = msgRows_.map((r: any) => r.id);

  // Step 2: get media rows, filtered by type
  let mediaQuery = supabase
    .from("message_media")
    .select("id, message_id, url, thumbnail_url, media_type, display_order")
    .in("message_id", messageIds)
    .order("display_order", { ascending: true });

  if (filter === "images") mediaQuery = mediaQuery.eq("media_type", "photo");
  if (filter === "videos") mediaQuery = mediaQuery.ilike("media_type", "video%");

  const { data: mediaRows, error: mediaError } = await mediaQuery;

  console.log("[gallery] mediaRows count:", mediaRows?.length ?? 0, "| mediaError:", mediaError?.message ?? null);
  console.log("[gallery] mediaRows sample:", JSON.stringify(mediaRows?.slice(0, 3)));

  if (mediaError) {
    return NextResponse.json({ error: mediaError.message }, { status: 500 });
  }

  const msgMap = new Map(msgRows_.map((r: any) => [r.id, r]));

  // Step 3: PPV unlock check
  const ppvMessageIds = msgRows_.filter((r: any) => r.is_ppv).map((r: any) => r.id);
  let unlockedByUser = new Set<number>();
  if (ppvMessageIds.length > 0) {
    const { data: unlocks } = await supabase
      .from("ppv_unlocks")
      .select("message_id")
      .eq("fan_id", user.id)
      .in("message_id", ppvMessageIds);
    for (const u of unlocks ?? []) unlockedByUser.add(u.message_id);
  }

  // Fallback: if message_media is empty, use messages.media_url directly
  let finalMedia = mediaRows ?? [];
  if (finalMedia.length === 0) {
    console.log("[gallery] message_media empty — trying fallback from messages.media_url");
    let fallbackQuery = supabase
      .from("messages")
      .select("id, media_url, thumbnail_url, media_type")
      .in("id", messageIds)
      .not("media_url", "is", null);

    // Apply type filter to fallback too
    if (filter === "images") fallbackQuery = fallbackQuery.eq("media_type", "photo");
    if (filter === "videos") fallbackQuery = fallbackQuery.ilike("media_type", "video%");

    const { data: fallbackRows } = await fallbackQuery;

    console.log("[gallery] fallbackRows count:", fallbackRows?.length ?? 0);
    console.log("[gallery] fallbackRows sample:", JSON.stringify(fallbackRows?.slice(0, 3)));

    finalMedia = (fallbackRows ?? []).map((r: any) => ({
      id:            r.id,
      message_id:    r.id,
      url:           r.media_url,
      thumbnail_url: r.thumbnail_url,
      media_type:    r.media_type,
      display_order: 0,
    }));
  }

  console.log("[gallery] finalMedia count before map:", finalMedia.length);

  const mediaItems = finalMedia
    .map((r: any) => {
      const msg = msgMap.get(r.message_id) as any;
      if (!msg) return null;
      const isSender   = msg.sender_id === user.id;
      const isPPV      = msg.is_ppv ?? false;
      const isUnlocked = !isPPV || isSender || unlockedByUser.has(r.message_id);
      const isVideo    = (r.media_type ?? "").startsWith("video") || r.media_type === "video";

      return {
        id:           r.id,
        messageId:    r.message_id,
        url:          isUnlocked ? r.url : null,
        thumbnailUrl: r.thumbnail_url ?? null,
        mediaType:    isVideo ? "video" : "image",
        isPPV,
        isUnlocked,
        isSender,
        createdAt:    msg.created_at,
      };
    })
    .filter(Boolean)
    .filter((item: any) => {
      if (filter === "images")   return item.mediaType === "image";
      if (filter === "videos")   return item.mediaType === "video";
      if (filter === "unlocked") return item.isPPV && item.isUnlocked;
      return true;
    });

  const lastMsg    = msgRows_[msgRows_.length - 1] as any;
  const nextCursor = msgRows_.length === limit ? lastMsg?.created_at ?? null : null;

  return NextResponse.json({
    mediaItems,
    nextCursor,
    _debug: {
      filter,
      msgRowsCount:    msgRows_.length,
      msgRowsSample:   msgRows_.slice(0, 3).map((r: any) => ({ id: r.id })),
      mediaRowsCount:  (mediaRows ?? []).length,
      mediaRowsSample: (mediaRows ?? []).slice(0, 3).map((r: any) => ({ id: r.id, media_type: r.media_type })),
      finalMediaCount: finalMedia.length,
      mediaItemsCount: mediaItems.length,
    },
  });
}