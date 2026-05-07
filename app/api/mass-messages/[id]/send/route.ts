// app/api/mass-messages/[id]/send/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";

const BATCH_SIZE = 50;        // recipients processed per cycle
const SEND_DELAY_MS = 50;     // throttle between messages (~20/sec)

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const massId = parseInt(id, 10);
  if (isNaN(massId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceSupabaseClient();

  // ── Load mass message ──────────────────────────────────────────────────────
  const { data: mm, error: mmErr } = await service
    .from("mass_messages")
    .select("*, mass_message_media(vault_item_id, display_order)")
    .eq("id", massId)
    .eq("creator_id", user.id)
    .single();

  if (mmErr || !mm) {
    return NextResponse.json({ error: "Mass message not found" }, { status: 404 });
  }
  if (!["sending", "scheduled"].includes(mm.status)) {
    return NextResponse.json({ error: `Cannot send — status is ${mm.status}` }, { status: 400 });
  }

  // Mark sending
  await service
    .from("mass_messages")
    .update({ status: "sending" })
    .eq("id", massId);

  // ── Resolve attached media (vault items → urls) ────────────────────────────
  const vaultIds = (mm.mass_message_media ?? [])
    .sort((a: any, b: any) => a.display_order - b.display_order)
    .map((m: any) => m.vault_item_id);

  let mediaItems: any[] = [];
  if (vaultIds.length > 0) {
    const { data: vaultData } = await service
      .from("vault_items")
      .select("id, media_type, file_url, thumbnail_url, duration_seconds, bunny_video_id")
      .in("id", vaultIds);
    // Preserve original order
    mediaItems = vaultIds.map((vid: number) => (vaultData ?? []).find((v: any) => Number(v.id) === Number(vid))).filter(Boolean);
  }

  const isPPV     = (mm.ppv_price_kobo ?? 0) > 0;
  const ppvPrice  = mm.ppv_price_kobo ?? null;
  const hasMedia  = mediaItems.length > 0;
  const firstMedia = hasMedia ? mediaItems[0] : null;

  // ── Process recipients in batches ──────────────────────────────────────────
  let delivered = 0;
  let failed    = 0;
  let cursor    = 0;

  while (true) {
    const { data: recipients } = await service
      .from("mass_message_recipients")
      .select("id, fan_id")
      .eq("mass_message_id", massId)
      .eq("status", "pending")
      .order("id", { ascending: true })
      .range(cursor, cursor + BATCH_SIZE - 1);

    if (!recipients || recipients.length === 0) break;

    for (const r of recipients) {
      try {
        // Find or create conversation between creator and fan
        const convId = await getOrCreateConversation(service, user.id, r.fan_id);
        if (!convId) throw new Error("Could not create conversation");

        // Insert messages row
        const messageRow: any = {
          conversation_id: convId,
          sender_id:       user.id,
          receiver_id:     r.fan_id,
          content:         mm.text ?? null,
          is_ppv:          isPPV,
          ppv_price:       ppvPrice,
          is_unlocked:     !isPPV,                                        // PPV starts locked
          is_delivered:    false,
        };
        if (hasMedia && firstMedia) {
          const { getBunnyStreamUrls } = await import("@/lib/utils/bunny");
          const streamThumb = firstMedia.media_type === "video" && firstMedia.bunny_video_id
            ? getBunnyStreamUrls(firstMedia.bunny_video_id).thumbnailUrl
            : null;
          messageRow.media_type    = firstMedia.media_type === "gif" ? "photo" : firstMedia.media_type;
          messageRow.media_url     = firstMedia.media_type === "video" ? `${firstMedia.file_url}#video` : firstMedia.file_url;
          messageRow.thumbnail_url = streamThumb ?? firstMedia.thumbnail_url ?? null;
        }

        const { data: msg, error: msgErr } = await service
          .from("messages")
          .insert(messageRow)
          .select("id")
          .single();
        if (msgErr || !msg) throw new Error(msgErr?.message ?? "Insert failed");

        // Insert message_media rows for all attachments (multi-media support)
        if (hasMedia) {
          const { getBunnyStreamUrls } = await import("@/lib/utils/bunny");
          const mmediaRows = mediaItems.map((m, idx) => {
            const streamThumb = m.media_type === "video" && m.bunny_video_id
              ? getBunnyStreamUrls(m.bunny_video_id).thumbnailUrl
              : null;
            return {
              message_id:    msg.id,
              url:           m.media_type === "video" ? `${m.file_url}#video` : m.file_url,
              thumbnail_url: streamThumb ?? m.thumbnail_url ?? null,
              media_type:    m.media_type === "gif" ? "photo" : m.media_type,
              display_order: idx,
            };
          });
          await service.from("message_media").insert(mmediaRows);
        }

        // Update conversation: preview, bump fan unread, reset deletes
        const preview = isPPV
          ? "🔒 PPV message"
          : hasMedia
          ? (firstMedia.media_type === "video" ? "📹 Video"
            : firstMedia.media_type === "audio" ? "🎙️ Voice message"
            : "📎 Media")
          : (mm.text ?? "");
        const { data: convNow } = await service
          .from("conversations")
          .select("unread_count_fan")
          .eq("id", convId)
          .single();
        await service
          .from("conversations")
          .update({
            last_message_at:      new Date().toISOString(),
            last_message_preview: preview,
            unread_count_fan:     (convNow?.unread_count_fan ?? 0) + 1,
            deleted_for_creator:  false,
            deleted_for_fan:      false,
          })
          .eq("id", convId);

        // Mark recipient delivered
        await service
          .from("mass_message_recipients")
          .update({
            message_id:   msg.id,
            status:       "delivered",
            delivered_at: new Date().toISOString(),
          })
          .eq("id", r.id);

        delivered++;
      } catch (err: any) {
        failed++;
        await service
          .from("mass_message_recipients")
          .update({
            status:       "failed",
            error_reason: err?.message ?? "Unknown error",
          })
          .eq("id", r.id);
      }

      // Throttle
      if (SEND_DELAY_MS > 0) await new Promise((r) => setTimeout(r, SEND_DELAY_MS));
    }

    cursor += BATCH_SIZE;
  }

  // ── Finalize ───────────────────────────────────────────────────────────────
  await service
    .from("mass_messages")
    .update({
      status:          "sent",
      sent_at:         new Date().toISOString(),
      delivered_count: delivered,
    })
    .eq("id", massId);

  return NextResponse.json({ delivered, failed });
}

// ── Helper: find or create conversation ──────────────────────────────────────
async function getOrCreateConversation(
  service: any,
  creatorId: string,
  fanId: string
): Promise<number | null> {
  // Try existing
  const { data: existing } = await service
    .from("conversations")
    .select("id")
    .eq("creator_id", creatorId)
    .eq("fan_id", fanId)
    .maybeSingle();
  if (existing?.id) return existing.id;

  // Create
  const { data: created, error } = await service
    .from("conversations")
    .insert({ creator_id: creatorId, fan_id: fanId })
    .select("id")
    .single();
  if (error || !created) {
    console.error("[getOrCreateConversation] error:", error?.message);
    return null;
  }
  return created.id;
}