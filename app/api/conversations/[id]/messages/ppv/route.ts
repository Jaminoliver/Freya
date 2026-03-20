import { NextResponse } from "next/server";
import { createServerSupabaseClient, getUser } from "@/lib/supabase/server";
import { signBunnyUrl } from "@/lib/utils/bunny";

const BUNNY_STORAGE_ZONE    = process.env.BUNNY_STORAGE_ZONE!;
const BUNNY_STORAGE_API_KEY = process.env.BUNNY_STORAGE_API_KEY!;
const BUNNY_STORAGE_HOST    = process.env.BUNNY_STORAGE_HOST ?? "storage.bunnycdn.com";
const BUNNY_CDN_URL         = process.env.BUNNY_CDN_URL!;

async function uploadToBunny(buffer: ArrayBuffer, filename: string, contentType: string): Promise<string> {
  const path = `/messages/ppv/${filename}`;
  const res  = await fetch(`https://${BUNNY_STORAGE_HOST}/${BUNNY_STORAGE_ZONE}${path}`, {
    method:  "PUT",
    headers: { "AccessKey": BUNNY_STORAGE_API_KEY, "Content-Type": contentType },
    body:    buffer,
  });
  if (!res.ok) throw new Error(`Bunny upload failed: ${res.status}`);
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

  // Check sender is a creator via profile role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "creator") {
    return NextResponse.json({ error: "Only creators can send PPV messages" }, { status: 403 });
  }

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
  const priceRaw = formData.get("price");
  const price    = priceRaw ? parseInt(String(priceRaw), 10) : 0;

  if (!files || files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  if (!price || price <= 0) {
    return NextResponse.json({ error: "Invalid price" }, { status: 400 });
  }

  const receiverId     = convo.fan_id === user.id ? convo.creator_id : convo.fan_id;
  const firstMediaType = files[0].type.startsWith("video/") ? "video" : "photo";

  const { data: message, error: insertError } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id:       user.id,
      receiver_id:     receiverId,
      content:         content,
      is_ppv:          true,
      ppv_price:       price,
      is_unlocked:     false,
      media_type:      firstMediaType,
    })
    .select("id, conversation_id, sender_id, content, created_at, is_read")
    .single();

  if (insertError || !message) {
    return NextResponse.json({ error: insertError?.message ?? "Insert failed" }, { status: 500 });
  }

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

      await supabase.from("message_media").insert({
        message_id:    message.id,
        url,
        media_type:    mediaType,
        display_order: i,
      });
    }

    // Store thumbnail so receiver can blur it behind the lock UI
    await supabase
      .from("messages")
      .update({ thumbnail_url: mediaUrls[0] })
      .eq("id", message.id);

  } catch {
    await supabase.from("messages").delete().eq("id", message.id);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  await supabase
    .from("conversations")
    .update({
      last_message_preview: "🔒 PPV message",
      last_message_at:      message.created_at,
      updated_at:           new Date().toISOString(),
    })
    .eq("id", conversationId);

  return NextResponse.json({
    message: {
      id:             message.id,
      conversationId: message.conversation_id,
      senderId:       message.sender_id,
      type:           "ppv",
      text:           message.content ?? undefined,
      mediaUrls,
      createdAt:      message.created_at,
      isRead:         message.is_read ?? false,
      ppv: {
        price,
        isUnlocked:    false,
        unlockedCount: 0,
      },
    },
  }, { status: 201 });
}