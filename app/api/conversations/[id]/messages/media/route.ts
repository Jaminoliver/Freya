import { NextResponse } from "next/server";
import { createServerSupabaseClient, getUser } from "@/lib/supabase/server";
import { signBunnyUrl } from "@/lib/utils/bunny";

const BUNNY_STORAGE_ZONE    = process.env.BUNNY_STORAGE_ZONE!;
const BUNNY_STORAGE_API_KEY = process.env.BUNNY_STORAGE_API_KEY!;
const BUNNY_STORAGE_HOST    = process.env.BUNNY_STORAGE_HOST ?? "storage.bunnycdn.com";
const BUNNY_CDN_URL         = process.env.BUNNY_CDN_URL!;

async function uploadToBunny(buffer: ArrayBuffer, filename: string, contentType: string): Promise<string> {
  const path = `/messages/${filename}`;
  const res  = await fetch(`https://${BUNNY_STORAGE_HOST}/${BUNNY_STORAGE_ZONE}${path}`, {
    method:  "PUT",
    headers: { "AccessKey": BUNNY_STORAGE_API_KEY, "Content-Type": contentType },
    body:    buffer,
  });
  if (!res.ok) throw new Error(`Bunny upload failed: ${res.status}`);
  // Return signed URL so CDN token auth doesn't block image display
  return signBunnyUrl(path);
}

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

  const { data: convo } = await supabase
    .from("conversations")
    .select("id, creator_id, fan_id, is_blocked")
    .eq("id", conversationId)
    .or(`creator_id.eq.${user.id},fan_id.eq.${user.id}`)
    .single();

  if (!convo)           return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (convo.is_blocked) return NextResponse.json({ error: "Conversation is blocked" }, { status: 403 });

  const formData = await request.formData();
  const files    = formData.getAll("files") as File[];
  const content  = (formData.get("content") as string | null)?.trim() ?? null;

  if (!files || files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const receiverId     = convo.creator_id === user.id ? convo.fan_id : convo.creator_id;
  const firstMediaType = files[0].type.startsWith("video/") ? "video" : "photo";

  // Step 1: Insert message row (media_url = null — signals "media still uploading")
  const { data: message, error: insertError } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id:       user.id,
      receiver_id:     receiverId,
      content:         content,
      is_ppv:          false,
      is_unlocked:     true,
      media_type:      firstMediaType,
      media_url:       null,
    })
    .select("id, conversation_id, sender_id, content, created_at, is_read")
    .single();

  if (insertError || !message) {
    console.error("[media upload] insert error:", insertError);
    return NextResponse.json({ error: insertError?.message ?? "Insert failed" }, { status: 500 });
  }

  // Step 2: Upload files to Bunny + insert message_media rows
  const mediaUrls: string[] = [];

  try {
    for (let i = 0; i < files.length; i++) {
      const file      = files[i];
      const ext       = file.name.split(".").pop() ?? "bin";
      const filename  = `${crypto.randomUUID()}.${ext}`;
      const buffer    = await file.arrayBuffer();
      const url       = await uploadToBunny(buffer, filename, file.type);
      const mediaType = file.type.startsWith("video/") ? "video" : "photo";
      mediaUrls.push(url);

      const { error: mediaInsertError } = await supabase.from("message_media").insert({
        message_id:    message.id,
        url,
        media_type:    mediaType,
        display_order: i,
      });
      if (mediaInsertError) console.error("[media upload] message_media insert error:", mediaInsertError);
    }
  } catch (err) {
    console.error("[media upload] error:", err);
    await supabase.from("messages").delete().eq("id", message.id);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  // Step 3: UPDATE messages row with first media URL — triggers Realtime UPDATE
  const { error: updateError } = await supabase
    .from("messages")
    .update({ media_url: mediaUrls[0] })
    .eq("id", message.id);
  if (updateError) {
    console.error("[media upload] media_url UPDATE failed:", updateError);
  }

  // Step 4: Update conversation metadata
  const isCreatorSending = convo.creator_id === user.id;
  const unreadField      = isCreatorSending ? "unread_count_fan" : "unread_count_creator";

  await supabase.rpc("increment_unread_count", {
    p_conversation_id: conversationId,
    p_field:           unreadField,
  });

  await supabase
    .from("conversations")
    .update({
      last_message_preview: content ?? "📷 Media",
      last_message_at:      message.created_at,
      updated_at:           new Date().toISOString(),
    })
    .eq("id", conversationId);

  return NextResponse.json({
    message: {
      id:             message.id,
      conversationId: message.conversation_id,
      senderId:       message.sender_id,
      type:           "media",
      text:           message.content ?? undefined,
      mediaUrls,
      createdAt:      message.created_at,
      isRead:         message.is_read ?? false,
    },
  }, { status: 201 });
}