import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/server";
import { uploadPhotoToBunny } from "@/lib/utils/bunny";

export const runtime = "nodejs";

// ─── GET /api/welcome-message ────────────────────────────────────────────────
// Fetch the authenticated creator's welcome message config + media

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { user, error: authError } = await getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get creator's sequence
    const { data: sequence } = await supabase
      .from("welcome_message_sequences")
      .select("id, sequence_name, is_active")
      .eq("creator_id", user.id)
      .maybeSingle();

    if (!sequence) {
      return NextResponse.json({ sequence: null, message: null, media: [] });
    }

    // Get the welcome message (step 1 only for MVP)
    const { data: message } = await supabase
      .from("welcome_messages")
      .select("id, step_number, delay_hours, message_content, is_ppv, ppv_price, media_type, media_url")
      .eq("sequence_id", sequence.id)
      .eq("step_number", 1)
      .maybeSingle();

    // Get media files if message exists
    let media: any[] = [];
    if (message) {
      const { data: mediaRows } = await supabase
        .from("welcome_message_media")
        .select("id, media_type, media_url, display_order")
        .eq("welcome_message_id", message.id)
        .order("display_order", { ascending: true });

      media = mediaRows ?? [];
    }

    return NextResponse.json({ sequence, message, media });
  } catch (error) {
    console.error("[Welcome Message GET] Error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// ─── POST /api/welcome-message ───────────────────────────────────────────────
// Create or update the creator's welcome message (upsert)

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { user, error: authError } = await getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const messageContent = (formData.get("message_content") as string | null)?.trim() ?? "";
    const isPpv = formData.get("is_ppv") === "true";
    const ppvPrice = formData.get("ppv_price") ? parseInt(formData.get("ppv_price") as string, 10) : null;
    const enabled = formData.get("enabled") !== "false";
    const files = formData.getAll("files") as File[];
    const existingMediaIds = formData.get("existing_media_ids")
      ? JSON.parse(formData.get("existing_media_ids") as string)
      : [];

    if (!messageContent && files.length === 0 && existingMediaIds.length === 0) {
      return NextResponse.json({ error: "Message content or media is required" }, { status: 400 });
    }

    if (files.length > 3) {
      return NextResponse.json({ error: "Maximum 3 media files allowed" }, { status: 400 });
    }

    // Step 1: Upsert welcome_message_sequences
    let sequenceId: number;

    const { data: existingSequence } = await supabase
      .from("welcome_message_sequences")
      .select("id")
      .eq("creator_id", user.id)
      .maybeSingle();

    if (existingSequence) {
      sequenceId = existingSequence.id;

      await supabase
        .from("welcome_message_sequences")
        .update({ is_active: enabled, updated_at: new Date().toISOString() })
        .eq("id", sequenceId);
    } else {
      const { data: newSequence, error: seqError } = await supabase
        .from("welcome_message_sequences")
        .insert({
          creator_id: user.id,
          sequence_name: "Welcome Message",
          is_active: enabled,
        })
        .select("id")
        .single();

      if (seqError || !newSequence) {
        console.error("[Welcome Message] Sequence insert error:", seqError);
        return NextResponse.json({ error: "Failed to create sequence" }, { status: 500 });
      }

      sequenceId = newSequence.id;
    }

    // Step 2: Upsert welcome_messages (step 1 only)
    let messageId: number;

    const { data: existingMessage } = await supabase
      .from("welcome_messages")
      .select("id")
      .eq("sequence_id", sequenceId)
      .eq("step_number", 1)
      .maybeSingle();

    const contentType = files.length > 0 || existingMediaIds.length > 0 ? "media" : "text";

    if (existingMessage) {
      messageId = existingMessage.id;

      await supabase
        .from("welcome_messages")
        .update({
          message_content: messageContent,
          is_ppv: isPpv,
          ppv_price: isPpv ? ppvPrice : null,
          media_type: contentType === "media" ? null : null,
          media_url: null,
        })
        .eq("id", messageId);
    } else {
      const { data: newMessage, error: msgError } = await supabase
        .from("welcome_messages")
        .insert({
          sequence_id: sequenceId,
          step_number: 1,
          delay_hours: 0,
          message_content: messageContent,
          is_ppv: isPpv,
          ppv_price: isPpv ? ppvPrice : null,
          media_type: null,
          media_url: null,
        })
        .select("id")
        .single();

      if (msgError || !newMessage) {
        console.error("[Welcome Message] Message insert error:", msgError);
        return NextResponse.json({ error: "Failed to create message" }, { status: 500 });
      }

      messageId = newMessage.id;
    }

    // Step 3: Handle media — delete removed, keep existing, upload new
    // Delete media that are no longer in existingMediaIds
    if (existingMessage) {
      if (existingMediaIds.length > 0) {
        await supabase
          .from("welcome_message_media")
          .delete()
          .eq("welcome_message_id", messageId)
          .not("id", "in", `(${existingMediaIds.join(",")})`);
      } else if (files.length === 0) {
        // No existing media to keep and no new files — clear all media
        await supabase
          .from("welcome_message_media")
          .delete()
          .eq("welcome_message_id", messageId);
      } else {
        // New files coming in, clear old media
        await supabase
          .from("welcome_message_media")
          .delete()
          .eq("welcome_message_id", messageId);
      }
    }

    // Upload new files to Bunny CDN
    const currentMediaCount = existingMediaIds.length;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const buffer = Buffer.from(await file.arrayBuffer());
      const mediaType = file.type.startsWith("video/") ? "video" : "photo";

      const result = await uploadPhotoToBunny(
        buffer,
        user.id,
        `welcome_${Date.now()}_${i}_${file.name}`,
        file.type
      );

      await supabase.from("welcome_message_media").insert({
        welcome_message_id: messageId,
        media_type: mediaType,
        media_url: result.url,
        display_order: currentMediaCount + i + 1,
      });
    }

    return NextResponse.json({ success: true, sequenceId, messageId });
  } catch (error) {
    console.error("[Welcome Message POST] Error:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

// ─── DELETE /api/welcome-message ─────────────────────────────────────────────
// Delete the creator's welcome message (keeps sequence, removes message + media)

export async function DELETE() {
  try {
    const supabase = await createServerSupabaseClient();
    const { user, error: authError } = await getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: sequence } = await supabase
      .from("welcome_message_sequences")
      .select("id")
      .eq("creator_id", user.id)
      .maybeSingle();

    if (!sequence) {
      return NextResponse.json({ error: "No welcome message found" }, { status: 404 });
    }

    // Cascade delete handles welcome_message_media via FK
    await supabase
      .from("welcome_messages")
      .delete()
      .eq("sequence_id", sequence.id);

    await supabase
      .from("welcome_message_sequences")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", sequence.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Welcome Message DELETE] Error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}