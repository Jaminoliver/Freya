// app/api/conversations/[id]/messages/voice/route.ts
import { NextResponse } from "next/server";
import { createServerSupabaseClient, getUser } from "@/lib/supabase/server";

const MAX_DURATION_SEC = 125;
const MAX_FILE_SIZE    = 5_000_000;

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
    .select("id, creator_id, fan_id")
    .eq("id", conversationId)
    .or(`creator_id.eq.${user.id},fan_id.eq.${user.id}`)
    .single();

  if (!convo) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

  const receiverId = convo.creator_id === user.id ? convo.fan_id : convo.creator_id;

  // ── Parse form data ───────────────────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file         = formData.get("audio")       as File   | null;
  const durationStr  = formData.get("duration")    as string | null;
  const peaksStr     = formData.get("peaks")       as string | null;
  const mimeType     = formData.get("mimeType")    as string | null;
  const replyToIdStr = formData.get("reply_to_id") as string | null;

  if (!file)                    return NextResponse.json({ error: "audio file required" },  { status: 400 });
  if (file.size === 0)          return NextResponse.json({ error: "Empty audio file" },     { status: 400 });
  if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "Audio file too large" }, { status: 413 });

  const duration = durationStr ? parseFloat(durationStr) : 0;
  if (!isFinite(duration) || duration < 0 || duration > MAX_DURATION_SEC) {
    return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
  }

  let peaks: number[] = [];
  try { peaks = peaksStr ? JSON.parse(peaksStr) : []; } catch {}
  if (!Array.isArray(peaks)) peaks = [];
  peaks = peaks.slice(0, 50).map((v) => Math.max(0, Math.min(1, Number(v) || 0)));

  const replyToId = replyToIdStr ? parseInt(replyToIdStr, 10) : null;

  // ── Upload to Supabase Storage ────────────────────────────────────────────
  const ext =
    mimeType?.includes("mp4")  ? "m4a"   :
    mimeType?.includes("webm") ? "webm"  :
    mimeType?.includes("ogg")  ? "ogg"   : "audio";

  const storagePath = `voice/${conversationId}/${user.id}/${Date.now()}.${ext}`;
  const buffer      = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("voice-messages")
    .upload(storagePath, buffer, {
      contentType: mimeType || "audio/webm",
      upsert: false,
    });

  if (uploadError) {
    console.error("[voice] Supabase upload failed:", uploadError);
    return NextResponse.json({ error: "Upload failed" }, { status: 502 });
  }

  const { data: publicUrlData } = supabase.storage
    .from("voice-messages")
    .getPublicUrl(storagePath);

  const audioUrl = publicUrlData.publicUrl;

  // ── Insert message ────────────────────────────────────────────────────────
  const { data: row, error: insertError } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id:       user.id,
      receiver_id:     receiverId,
      audio_url:       audioUrl,
      audio_duration:  duration,
      audio_peaks:     peaks,
      reply_to_id:     replyToId,
    })
    .select()
    .single();

  if (insertError || !row) {
    console.error("[voice] DB insert failed:", insertError);
    return NextResponse.json({ error: insertError?.message ?? "Insert failed" }, { status: 500 });
  }

  // ── Bump conversation ─────────────────────────────────────────────────────
  await supabase
    .from("conversations")
    .update({
      last_message_at:      row.created_at,
      last_message_preview: "🎙️ Voice message",
    })
    .eq("id", conversationId);

  return NextResponse.json({
    message: {
      id:             row.id,
      conversationId: row.conversation_id,
      senderId:       row.sender_id,
      type:           "voice",
      audioUrl:       row.audio_url,
      audioDuration:  row.audio_duration,
      audioPeaks:     row.audio_peaks,
      isRead:         row.is_read      ?? false,
      isDelivered:    row.is_delivered ?? false,
      createdAt:      row.created_at,
      replyToId:      row.reply_to_id  ?? null,
    },
  });
}