// app/api/conversations/[id]/messages/[msgId]/unlock/route.ts
// PPV message unlock endpoint — fan pays to unlock a PPV message
// Inserts ppv_message_unlocks row, debits wallet, credits creator,
// flips messages.is_unlocked, notifies creator, returns unlocked media URLs

import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient, getUser } from "@/lib/supabase/server";
import { hasSufficientBalance, debitFanCreditCreator, ensureWalletExists } from "@/lib/payments/wallet";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; msgId: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { user, error: authError } = await getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, msgId } = await params;
  const conversationId = parseInt(id, 10);
  const messageId      = parseInt(msgId, 10);
  if (isNaN(conversationId) || isNaN(messageId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const { data: convo } = await supabase
    .from("conversations")
    .select("id, creator_id, fan_id")
    .eq("id", conversationId)
    .or(`creator_id.eq.${user.id},fan_id.eq.${user.id}`)
    .single();

  if (!convo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: row } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, content, is_ppv, ppv_price, media_type, thumbnail_url, is_read, created_at, reply_to_id")
    .eq("id", messageId)
    .eq("conversation_id", conversationId)
    .single();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!row.is_ppv) return NextResponse.json({ error: "Not a PPV message" }, { status: 400 });

  const { data: unlocks } = await supabase
    .from("ppv_message_unlocks")
    .select("fan_id")
    .eq("message_id", messageId);

  const isCreator  = row.sender_id === user.id;
  const isUnlocked = isCreator || (unlocks ?? []).some((u) => u.fan_id === user.id);

  const { data: mediaRows } = await supabase
    .from("message_media")
    .select("url, media_type, display_order")
    .eq("message_id", messageId)
    .order("display_order", { ascending: true });

  const mediaUrls = (mediaRows ?? []).map((m) => m.url);

  return NextResponse.json({
    message: {
      id:             row.id,
      conversationId: row.conversation_id,
      senderId:       row.sender_id,
      type:           "ppv",
      text:           row.content ?? undefined,
      mediaUrls:      isUnlocked ? mediaUrls : mediaUrls.map(() => ""),
      thumbnailUrl:   row.thumbnail_url ?? null,
      createdAt:      row.created_at,
      isRead:         row.is_read ?? false,
      replyToId:      row.reply_to_id ?? null,
      ppv: {
        price:         row.ppv_price ?? 0,
        isUnlocked,
        unlockedCount: (unlocks ?? []).length,
      },
    },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; msgId: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { user, error: authError } = await getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, msgId } = await params;
  const conversationId = parseInt(id, 10);
  const messageId      = parseInt(msgId, 10);
  if (isNaN(conversationId) || isNaN(messageId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const { data: convo } = await supabase
    .from("conversations")
    .select("id, creator_id, fan_id, is_blocked")
    .eq("id", conversationId)
    .or(`creator_id.eq.${user.id},fan_id.eq.${user.id}`)
    .single();

  if (!convo)           return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  if (convo.is_blocked) return NextResponse.json({ error: "Conversation is blocked" }, { status: 403 });

  const { data: message } = await supabase
    .from("messages")
    .select("id, is_ppv, ppv_price, sender_id, conversation_id")
    .eq("id", messageId)
    .eq("conversation_id", conversationId)
    .single();

  if (!message)                       return NextResponse.json({ error: "Message not found" }, { status: 404 });
  if (!message.is_ppv)                return NextResponse.json({ error: "Not a PPV message" }, { status: 400 });
  if (message.sender_id === user.id)  return NextResponse.json({ error: "Cannot unlock your own PPV" }, { status: 403 });

  const priceKobo = message.ppv_price ?? 0;
  if (priceKobo <= 0) return NextResponse.json({ error: "Invalid price" }, { status: 400 });

  // Check if already unlocked
  const { data: existing } = await supabase
    .from("ppv_message_unlocks")
    .select("id")
    .eq("message_id", messageId)
    .eq("fan_id", user.id)
    .maybeSingle();

  if (existing) return NextResponse.json({ error: "Already unlocked" }, { status: 409 });

  // Check balance
  const sufficient = await hasSufficientBalance(user.id, priceKobo);
  if (!sufficient) {
    return NextResponse.json({ error: "Insufficient balance" }, { status: 402 });
  }

  await ensureWalletExists(user.id);
  await ensureWalletExists(message.sender_id);

  const serviceSupabase = createServiceSupabaseClient();

  // 1. Insert unlock row
  const { data: unlock, error: unlockError } = await serviceSupabase
    .from("ppv_message_unlocks")
    .insert({
      message_id:  messageId,
      fan_id:      user.id,
      amount_paid: priceKobo,
    })
    .select("id")
    .single();

  if (unlockError || !unlock) {
    console.error("[ChatPPVUnlock] insert error:", unlockError);
    return NextResponse.json({ error: "Failed to unlock" }, { status: 500 });
  }

  const unlockRefId = `ppvmsg_${unlock.id}`;

  // 2. Debit fan / credit creator
  try {
    await debitFanCreditCreator({
      fanId:           user.id,
      creatorId:       message.sender_id,
      amountKobo:      priceKobo,
      fanCategory:     "PPV_PURCHASE",
      creatorCategory: "CREATOR_EARNING",
      referenceId:     unlockRefId,
    });
  } catch (err) {
    console.error("[ChatPPVUnlock] wallet error:", err);
    await serviceSupabase.from("ppv_message_unlocks").delete().eq("id", unlock.id);
    return NextResponse.json({ error: "Payment failed" }, { status: 500 });
  }

  // 3. Flip is_unlocked flag on message (for quick UI check)
  await serviceSupabase
    .from("messages")
    .update({ is_unlocked: true })
    .eq("id", messageId);

  // 4. Notify creator (no trigger exists for ppv_message_unlocks)
  try {
    const { data: fanProfile } = await supabase
      .from("profiles")
      .select("display_name, username, avatar_url")
      .eq("id", user.id)
      .single();

    const refId = JSON.stringify({
      kind:           "message_ppv",
      conversationId,
      messageId,
      unlockId:       unlock.id,
    });

    await serviceSupabase.from("notifications").insert({
      user_id:      message.sender_id,
      type:         "ppv_purchased",
      role:         "creator",
      actor_id:     user.id,
      actor_name:   fanProfile?.display_name ?? fanProfile?.username ?? "Someone",
      actor_handle: fanProfile?.username ?? "",
      actor_avatar: fanProfile?.avatar_url ?? null,
      body_text:    `unlocked your message for ₦${(priceKobo / 100).toLocaleString()}`,
      sub_text:     "",
      reference_id: refId,
      is_read:      false,
    });
  } catch (notifErr) {
    console.error("[ChatPPVUnlock] notification error:", notifErr);
  }

  // 5. Return unlocked media URLs
  const { data: media } = await supabase
    .from("message_media")
    .select("url, thumbnail_url, media_type, display_order")
    .eq("message_id", messageId)
    .order("display_order", { ascending: true });

  return NextResponse.json({
    mediaUrls: (media ?? []).map((m) => m.url),
    pricePaid: priceKobo,
    unlockId:  unlock.id,
  });
}