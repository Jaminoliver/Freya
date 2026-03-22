import { createServiceSupabaseClient } from "@/lib/supabase/server";

/**
 * sendWelcomeMessage
 *
 * Called server-side when a fan's subscription is activated.
 * Checks if the creator has an enabled welcome message,
 * creates a DM conversation if needed, inserts the message(s),
 * and logs the send to welcome_message_sends.
 */
export async function sendWelcomeMessage(creatorId: string, fanId: string) {
  const supabase = createServiceSupabaseClient();

  try {
    console.log("[Welcome Message] Starting — creatorId:", creatorId, "fanId:", fanId);

    // Step 1: Check if creator has an active welcome message sequence
    const { data: sequence, error: seqError } = await supabase
      .from("welcome_message_sequences")
      .select("id, is_active")
      .eq("creator_id", creatorId)
      .eq("is_active", true)
      .maybeSingle();

    console.log("[Welcome Message] Sequence lookup:", { sequence, seqError });

    if (!sequence) return;

    // Step 2: Get welcome message (step 1 only for MVP)
    const { data: welcomeMsg, error: wmError } = await supabase
      .from("welcome_messages")
      .select("id, message_content, is_ppv, ppv_price, media_type, media_url")
      .eq("sequence_id", sequence.id)
      .eq("step_number", 1)
      .maybeSingle();

    console.log("[Welcome Message] Message lookup:", { welcomeMsg, wmError });

    if (!welcomeMsg) return;

    // Step 3: Get media files for this welcome message
    const { data: mediaFiles, error: mediaError } = await supabase
      .from("welcome_message_media")
      .select("id, media_type, media_url, display_order")
      .eq("welcome_message_id", welcomeMsg.id)
      .order("display_order", { ascending: true });

    console.log("[Welcome Message] Media lookup:", { mediaFiles, mediaError });

    // Step 4: Get fan's display name for {{fan_name}} replacement
    const { data: fanProfile } = await supabase
      .from("profiles")
      .select("display_name, username")
      .eq("id", fanId)
      .single();

    const fanName = fanProfile?.display_name || fanProfile?.username || "there";
    console.log("[Welcome Message] Fan name:", fanName);

    // Step 5: Replace {{fan_name}} placeholder in message content
    const messageContent = welcomeMsg.message_content.replace(
      /\{\{fan_name\}\}/gi,
      fanName
    );

    // Step 6: Find or create conversation between creator and fan
    let conversationId: number;

    const { data: existingConvo, error: convoLookupError } = await supabase
      .from("conversations")
      .select("id")
      .eq("creator_id", creatorId)
      .eq("fan_id", fanId)
      .maybeSingle();

    console.log("[Welcome Message] Existing conversation lookup:", { existingConvo, convoLookupError });

    if (existingConvo) {
      conversationId = existingConvo.id;
      console.log("[Welcome Message] Using existing conversation:", conversationId);
    } else {
      console.log("[Welcome Message] No existing conversation — creating new one");
      const { data: newConvo, error: convoError } = await supabase
        .from("conversations")
        .insert({
          creator_id: creatorId,
          fan_id: fanId,
        })
        .select("id")
        .single();

      if (convoError || !newConvo) {
        console.error("[Welcome Message] Failed to create conversation:", convoError);
        return;
      }

      conversationId = newConvo.id;
      console.log("[Welcome Message] New conversation created:", conversationId);
    }

    // Step 7: Determine media type and URL from the first media file (if any)
    const firstMedia = mediaFiles && mediaFiles.length > 0 ? mediaFiles[0] : null;
    const hasMedia = mediaFiles && mediaFiles.length > 0;

    // Step 8: Insert message into messages table
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

    console.log("[Welcome Message] Message inserted:", sentMessage.id, "in conversation:", conversationId);

    // Step 9: Insert additional media into message_media table (if more than 1 file)
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

    // Step 10: Update conversation with last message preview
    const preview = messageContent
      ? messageContent.substring(0, 100)
      : hasMedia
        ? "Sent media"
        : "";

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
      console.log("[Welcome Message] Conversation updated with preview");
    }

    // Step 11: Log to welcome_message_sends
    const { error: sendLogError } = await supabase.from("welcome_message_sends").insert({
      welcome_message_id: welcomeMsg.id,
      creator_id: creatorId,
      fan_id: fanId,
    });

    if (sendLogError) {
      console.error("[Welcome Message] Failed to log send:", sendLogError);
    }

    console.log(`[Welcome Message] Sent to fan ${fanId} from creator ${creatorId}`);
  } catch (error) {
    console.error("[Welcome Message] Unexpected error:", error);
  }
}