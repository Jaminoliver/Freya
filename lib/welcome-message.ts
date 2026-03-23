import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function sendWelcomeMessage(creatorId: string, fanId: string) {
  const supabase = createServiceSupabaseClient();

  try {
    console.log("[Welcome Message] ── START ──────────────────────────────────");
    console.log("[Welcome Message] creatorId:", creatorId, "| fanId:", fanId);

    // Step 1: Check active sequence
    const { data: sequence, error: seqError } = await supabase
      .from("welcome_message_sequences")
      .select("id, is_active")
      .eq("creator_id", creatorId)
      .eq("is_active", true)
      .maybeSingle();

    console.log("[Welcome Message] Sequence lookup:", { sequence, seqError });
    if (!sequence) {
      console.log("[Welcome Message] DECISION: No active sequence — skipping");
      return;
    }

    // Step 2: Get welcome message + version
    const { data: welcomeMsg, error: wmError } = await supabase
      .from("welcome_messages")
      .select("id, message_content, is_ppv, ppv_price, media_type, media_url, version")
      .eq("sequence_id", sequence.id)
      .eq("step_number", 1)
      .maybeSingle();

    console.log("[Welcome Message] Message lookup:", { welcomeMsg, wmError });
    if (!welcomeMsg) {
      console.log("[Welcome Message] DECISION: No welcome message found — skipping");
      return;
    }

    const currentVersion = welcomeMsg.version ?? 1;
    console.log(`[Welcome Message] Current welcome message version: ${currentVersion}`);

    // Step 3: Check if fan already received THIS version
    const { data: existingSends, error: sendCheckError } = await supabase
      .from("welcome_message_sends")
      .select("id, version")
      .eq("welcome_message_id", welcomeMsg.id)
      .eq("creator_id", creatorId)
      .eq("fan_id", fanId)
      .eq("version", currentVersion)
      .limit(1);

    const existingSend = existingSends && existingSends.length > 0 ? existingSends[0] : null;

    console.log(`[Welcome Message] Version check — fanId: ${fanId} | version compared: ${currentVersion} | existingSend:`, existingSend, "| error:", sendCheckError);

    if (existingSend) {
      console.log(`[Welcome Message] DECISION: Fan ${fanId} already received version ${currentVersion} — SKIPPING`);
      return;
    }

    console.log(`[Welcome Message] DECISION: Fan ${fanId} has NOT received version ${currentVersion} — SENDING`);

    // Step 4: Get media files
    const { data: mediaFiles, error: mediaError } = await supabase
      .from("welcome_message_media")
      .select("id, media_type, media_url, display_order")
      .eq("welcome_message_id", welcomeMsg.id)
      .order("display_order", { ascending: true });

    console.log("[Welcome Message] Media lookup:", { mediaFiles, mediaError });

    // Step 5: Get fan name
    const { data: fanProfile } = await supabase
      .from("profiles")
      .select("display_name, username")
      .eq("id", fanId)
      .single();

    const fanName = fanProfile?.display_name || fanProfile?.username || "there";
    console.log("[Welcome Message] Fan name resolved:", fanName);

    // Step 6: Replace {{fan_name}}
    const messageContent = welcomeMsg.message_content.replace(/\{\{fan_name\}\}/gi, fanName);

    // Step 7: Find or create conversation
    let conversationId: number;

    const { data: existingConvo, error: convoLookupError } = await supabase
      .from("conversations")
      .select("id")
      .eq("creator_id", creatorId)
      .eq("fan_id", fanId)
      .maybeSingle();

    console.log("[Welcome Message] Conversation lookup:", { existingConvo, convoLookupError });

    if (existingConvo) {
      conversationId = existingConvo.id;
      console.log("[Welcome Message] Using existing conversation:", conversationId);

      await supabase
        .from("conversations")
        .update({
          deleted_for_creator: false,
          deleted_for_fan: false,
          deleted_before_creator: null,
          deleted_before_fan: null,
        })
        .eq("id", conversationId);
    } else {
      console.log("[Welcome Message] No existing conversation — creating new one");
      const { data: newConvo, error: convoError } = await supabase
        .from("conversations")
        .insert({ creator_id: creatorId, fan_id: fanId })
        .select("id")
        .single();

      if (convoError || !newConvo) {
        console.error("[Welcome Message] Failed to create conversation:", convoError);
        return;
      }

      conversationId = newConvo.id;
      console.log("[Welcome Message] New conversation created:", conversationId);
    }

    // Step 8: Insert message
    const firstMedia = mediaFiles && mediaFiles.length > 0 ? mediaFiles[0] : null;
    const hasMedia = mediaFiles && mediaFiles.length > 0;

    const { data: sentMessage, error: msgError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: creatorId,
        receiver_id: fanId,
        content: messageContent || null,
        is_ppv: welcomeMsg.is_ppv ?? false,
        ppv_price: welcomeMsg.is_ppv ? welcomeMsg.ppv_price : null,
        is_unlocked: welcomeMsg.is_ppv ? false : true,
        media_type: firstMedia?.media_type ?? null,
        media_url: firstMedia?.media_url ?? null,
      })
      .select("id, created_at")
      .single();

    if (msgError || !sentMessage) {
      console.error("[Welcome Message] Failed to insert message:", msgError);
      return;
    }

    console.log("[Welcome Message] Message inserted — messageId:", sentMessage.id, "| conversationId:", conversationId);

    // Step 9: Insert additional media
    if (hasMedia && mediaFiles.length > 0) {
      const mediaInserts = mediaFiles.map((m, i) => ({
        message_id: sentMessage.id,
        url: m.media_url,
        media_type: m.media_type,
        display_order: i,
      }));

      const { error: mediaMsgError } = await supabase
        .from("message_media")
        .insert(mediaInserts);

      if (mediaMsgError) {
        console.error("[Welcome Message] Failed to insert message_media:", mediaMsgError);
      } else {
        console.log("[Welcome Message] Inserted", mediaInserts.length, "message_media rows");
      }
    }

    // Step 10: Update conversation preview
    const preview = messageContent
      ? messageContent.substring(0, 100)
      : hasMedia ? "Sent media" : "";

    const { error: convoUpdateError } = await supabase
      .from("conversations")
      .update({
        last_message_at: sentMessage.created_at,
        last_message_preview: preview,
        unread_count_fan: 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId);

    if (convoUpdateError) {
      console.error("[Welcome Message] Failed to update conversation:", convoUpdateError);
    } else {
      console.log("[Welcome Message] Conversation preview updated");
    }

    // Step 11: Log send with version
    const { error: sendLogError } = await supabase
      .from("welcome_message_sends")
      .insert({
        welcome_message_id: welcomeMsg.id,
        creator_id: creatorId,
        fan_id: fanId,
        version: currentVersion,
      });

    if (sendLogError) {
      console.error("[Welcome Message] Failed to log send:", sendLogError);
    } else {
      console.log(`[Welcome Message] Send logged — fanId: ${fanId} | version: ${currentVersion}`);
    }

    console.log(`[Welcome Message] ── DONE — sent to fan ${fanId} from creator ${creatorId} at version ${currentVersion} ──`);
  } catch (error) {
    console.error("[Welcome Message] Unexpected error:", error);
  }
}