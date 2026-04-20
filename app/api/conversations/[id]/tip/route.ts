// app/api/conversations/[id]/tip/route.ts
// Chat tip endpoint — tips sent inside a conversation
// Inserts tips row (no post_id), debits wallet, creates a tip message in chat,
// updates trigger-generated notifications with chat context

import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient, getUser } from "@/lib/supabase/server";
import { hasSufficientBalance, debitFanCreditCreator, ensureWalletExists } from "@/lib/payments/wallet";

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

  const body = await request.json().catch(() => ({}));
  const amount = typeof body.amount === "number" ? body.amount : NaN;

  if (!amount || isNaN(amount) || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  // amount comes in naira → convert to kobo
  const amountKobo = Math.round(amount * 100);

  // Verify conversation + membership
  const { data: convo } = await supabase
    .from("conversations")
    .select("id, creator_id, fan_id, is_blocked")
    .eq("id", conversationId)
    .or(`creator_id.eq.${user.id},fan_id.eq.${user.id}`)
    .single();

  if (!convo)           return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  if (convo.is_blocked) return NextResponse.json({ error: "Conversation is blocked" }, { status: 403 });

  const recipientId = convo.fan_id === user.id ? convo.creator_id : convo.fan_id;

  if (recipientId === user.id) {
    return NextResponse.json({ error: "Cannot tip yourself" }, { status: 400 });
  }

  // Check balance
  const sufficient = await hasSufficientBalance(user.id, amountKobo);
  if (!sufficient) {
    return NextResponse.json({ error: "Insufficient wallet balance" }, { status: 402 });
  }

  await ensureWalletExists(user.id);
  await ensureWalletExists(recipientId);

  const serviceSupabase = createServiceSupabaseClient();

  // 1. Insert tip row (no post_id, no live_stream_id → identifies as chat tip)
  const { data: tip, error: tipError } = await serviceSupabase
    .from("tips")
    .insert({
      tipper_id:    user.id,
      recipient_id: recipientId,
      post_id:      null,
      amount:       amountKobo,
      message:      null,
    })
    .select("id")
    .single();

  if (tipError || !tip) {
    console.error("[ChatTip] tip insert error:", tipError);
    return NextResponse.json({ error: "Failed to record tip" }, { status: 500 });
  }

  // 2. Debit fan / credit creator
  try {
    await debitFanCreditCreator({
      fanId:           user.id,
      creatorId:       recipientId,
      amountKobo,
      fanCategory:     "TIP",
      creatorCategory: "CREATOR_EARNING",
      referenceId:     `tip_${tip.id}`,
    });
  } catch (err) {
    console.error("[ChatTip] wallet error:", err);
    await serviceSupabase.from("tips").delete().eq("id", tip.id);
    return NextResponse.json({ error: "Payment failed" }, { status: 500 });
  }

  // 3. Insert chat tip message (renders as a tip bubble in the conversation)
  const createdAt = new Date().toISOString();

  const { data: tipMessage, error: messageError } = await serviceSupabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id:       user.id,
      receiver_id:     recipientId,
      content:         null,
      is_tip:          true,
      tip_id:          tip.id,
      created_at:      createdAt,
    })
    .select("id, conversation_id, sender_id, created_at, is_read")
    .single();

  if (messageError || !tipMessage) {
    console.error("[ChatTip] message insert error:", messageError);
    return NextResponse.json({ error: "Failed to create tip message" }, { status: 500 });
  }

  // 4. Update trigger-generated notifications for this tip to include chat context
  //    Trigger sets reference_id to plain tip id (string) when no post_id.
  const chatTipRef = JSON.stringify({
    kind:           "message_tip",
    conversationId,
    messageId:      tipMessage.id,
    tipId:          tip.id,
  });

  await serviceSupabase
    .from("notifications")
    .update({ reference_id: chatTipRef })
    .eq("reference_id", String(tip.id));

  // 5. Update conversation preview
  await serviceSupabase
    .from("conversations")
    .update({
      last_message_preview: `💰 Tipped ₦${(amountKobo / 100).toLocaleString()}`,
      last_message_at:      createdAt,
      updated_at:           createdAt,
    })
    .eq("id", conversationId);

  return NextResponse.json({
    message: {
      id:             tipMessage.id,
      conversationId: tipMessage.conversation_id,
      senderId:       tipMessage.sender_id,
      type:           "tip",
      createdAt:      tipMessage.created_at,
      isRead:         tipMessage.is_read ?? false,
      tip: {
        amount: amountKobo,
        tipId:  tip.id,
      },
    },
  }, { status: 201 });
}