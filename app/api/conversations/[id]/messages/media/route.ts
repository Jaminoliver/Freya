import { NextResponse } from "next/server";
import { createServerSupabaseClient, getUser } from "@/lib/supabase/server";
import {
  uploadPhotoToBunny,
  createBunnyVideo,
  uploadVideoToBunny,
  getBunnyStreamUrls,
} from "@/lib/utils/bunny";

export async function POST(
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
    .select("id, creator_id, fan_id, is_blocked")
    .eq("id", conversationId)
    .or(`creator_id.eq.${user.id},fan_id.eq.${user.id}`)
    .single();

  if (!convo) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  if (convo.is_blocked) {
    return NextResponse.json({ error: "Conversation is blocked" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const content = formData.get("content") as string | null;

  if (!file) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm", "audio/mpeg", "audio/mp4"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }

  let mediaType: "photo" | "video" | "audio";
  if (file.type.startsWith("image/")) mediaType = "photo";
  else if (file.type.startsWith("video/")) mediaType = "video";
  else mediaType = "audio";

  const buffer = Buffer.from(await file.arrayBuffer());
  let mediaUrl: string;
  let thumbnailUrl: string | null = null;

  if (mediaType === "video") {
    const videoId = await createBunnyVideo(`msg-${conversationId}-${Date.now()}`);
    await uploadVideoToBunny(buffer, videoId);
    const urls = getBunnyStreamUrls(videoId);
    mediaUrl = urls.hlsUrl;
    thumbnailUrl = urls.thumbnailUrl;
  } else {
    const result = await uploadPhotoToBunny(buffer, user.id, file.name, file.type);
    mediaUrl = result.url;
  }

  const receiverId =
    convo.creator_id === user.id ? convo.fan_id : convo.creator_id;

  const { data: message, error: insertError } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      receiver_id: receiverId,
      content: content?.trim() ?? null,
      media_type: mediaType,
      media_url: mediaUrl,
      thumbnail_url: thumbnailUrl,
      is_ppv: false,
      is_unlocked: true,
    })
    .select("id, conversation_id, sender_id, content, media_type, media_url, thumbnail_url, created_at")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const isCreatorSending = convo.creator_id === user.id;
  const unreadField = isCreatorSending ? "unread_count_fan" : "unread_count_creator";

  await supabase.rpc("increment_unread_count", {
    p_conversation_id: conversationId,
    p_field: unreadField,
  });

  await supabase
    .from("conversations")
    .update({
      last_message_preview: mediaType === "photo" ? "📷 Photo" : mediaType === "video" ? "🎥 Video" : "🎵 Audio",
      last_message_at: message.created_at,
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId);

  return NextResponse.json({
    message: {
      id: message.id,
      conversationId: message.conversation_id,
      senderId: message.sender_id,
      type: "media",
      text: message.content ?? undefined,
      mediaUrls: [message.media_url],
      thumbnailUrl: message.thumbnail_url ?? null,
      createdAt: message.created_at,
    },
  }, { status: 201 });
}