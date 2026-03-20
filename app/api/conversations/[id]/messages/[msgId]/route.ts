import { NextResponse } from "next/server";
import { createServerSupabaseClient, getUser } from "@/lib/supabase/server";

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
    .select("id, conversation_id, sender_id, content, is_ppv, ppv_price, is_unlocked, media_type, media_url, thumbnail_url, is_read, created_at, reply_to_id")
    .eq("id", messageId)
    .eq("conversation_id", conversationId)
    .single();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: mediaRows } = await supabase
    .from("message_media")
    .select("url, thumbnail_url, media_type, display_order")
    .eq("message_id", messageId)
    .order("display_order", { ascending: true });

  const mediaUrls = (mediaRows ?? []).length > 0
    ? (mediaRows ?? []).map((m) => m.url)
    : row.media_url ? [row.media_url] : [];

  const base = {
    id:             row.id,
    conversationId: row.conversation_id,
    senderId:       row.sender_id,
    createdAt:      row.created_at,
    isRead:         row.is_read ?? false,
    replyToId:      row.reply_to_id ?? null,
  };

  if (row.is_ppv) {
    const isCreator = row.sender_id === user.id;
    const { data: unlocks } = await supabase
      .from("ppv_unlocks")
      .select("fan_id")
      .eq("message_id", messageId);
    const isUnlocked = isCreator || (unlocks ?? []).some((u) => u.fan_id === user.id);
    return NextResponse.json({
      message: {
        ...base,
        type:         "ppv",
        text:         row.content ?? undefined,
        mediaUrls:    isUnlocked ? mediaUrls : mediaUrls.map(() => ""),
        thumbnailUrl: row.thumbnail_url ?? null,
        ppv: {
          price:         row.ppv_price ?? 0,
          isUnlocked,
          unlockedCount: (unlocks ?? []).length,
        },
      },
    });
  }

  if (row.media_type || mediaUrls.length > 0) {
    return NextResponse.json({
      message: {
        ...base,
        type:         "media",
        text:         row.content ?? undefined,
        mediaUrls,
        thumbnailUrl: row.thumbnail_url ?? null,
      },
    });
  }

  return NextResponse.json({
    message: { ...base, type: "text", text: row.content ?? "" },
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
    .select("id, creator_id, fan_id")
    .eq("id", conversationId)
    .or(`creator_id.eq.${user.id},fan_id.eq.${user.id}`)
    .single();

  if (!convo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (convo.creator_id === user.id) {
    return NextResponse.json({ error: "Creators cannot unlock their own PPV" }, { status: 403 });
  }

  const { data: message } = await supabase
    .from("messages")
    .select("id, is_ppv, ppv_price, sender_id, conversation_id")
    .eq("id", messageId)
    .eq("conversation_id", conversationId)
    .single();

  if (!message)        return NextResponse.json({ error: "Message not found" }, { status: 404 });
  if (!message.is_ppv) return NextResponse.json({ error: "Not a PPV message" }, { status: 400 });

  const priceKobo = message.ppv_price ?? 0;
  if (priceKobo <= 0)  return NextResponse.json({ error: "Invalid price" }, { status: 400 });

  const { data: existing } = await supabase
    .from("ppv_unlocks")
    .select("id")
    .eq("message_id", messageId)
    .eq("fan_id", user.id)
    .maybeSingle();

  if (existing) return NextResponse.json({ error: "Already unlocked" }, { status: 409 });

  const { data: fanWallet } = await supabase
    .from("wallets")
    .select("id, balance, total_spent, lock_version")
    .eq("user_id", user.id)
    .single();

  if (!fanWallet) return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
  if (fanWallet.balance < priceKobo) {
    return NextResponse.json({ error: "Insufficient balance" }, { status: 402 });
  }

  const { error: deductError } = await supabase
    .from("wallets")
    .update({
      balance:      fanWallet.balance - priceKobo,
      total_spent:  (fanWallet.total_spent ?? 0) + priceKobo,
      lock_version: fanWallet.lock_version + 1,
      updated_at:   new Date().toISOString(),
    })
    .eq("id", fanWallet.id)
    .eq("lock_version", fanWallet.lock_version);

  if (deductError) {
    return NextResponse.json({ error: "Payment failed — please try again" }, { status: 409 });
  }

  const creatorId        = message.sender_id;
  const platformFeeKobo  = Math.round(priceKobo * 0.18);
  const creatorShareKobo = priceKobo - platformFeeKobo;

  const { data: creatorWallet } = await supabase
    .from("wallets")
    .select("id, balance, total_earned")
    .eq("user_id", creatorId)
    .single();

  if (creatorWallet) {
    await supabase
      .from("wallets")
      .update({
        balance:      creatorWallet.balance + creatorShareKobo,
        total_earned: (creatorWallet.total_earned ?? 0) + creatorShareKobo,
        updated_at:   new Date().toISOString(),
      })
      .eq("id", creatorWallet.id);
  }

  const { error: unlockError } = await supabase
    .from("ppv_unlocks")
    .insert({ message_id: messageId, fan_id: user.id, amount_paid: priceKobo });

  if (unlockError) {
    await supabase
      .from("wallets")
      .update({ balance: fanWallet.balance, total_spent: fanWallet.total_spent ?? 0, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
    if (creatorWallet) {
      await supabase
        .from("wallets")
        .update({ balance: creatorWallet.balance, updated_at: new Date().toISOString() })
        .eq("user_id", creatorId);
    }
    return NextResponse.json({ error: "Unlock failed" }, { status: 500 });
  }

  const { data: media } = await supabase
    .from("message_media")
    .select("url, thumbnail_url, media_type")
    .eq("message_id", messageId)
    .order("display_order", { ascending: true });

  return NextResponse.json({
    mediaUrls: (media ?? []).map((m) => m.url),
    pricePaid: priceKobo,
  });
}

export async function DELETE(
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

  // Verify user belongs to this conversation
  const { data: convo } = await supabase
    .from("conversations")
    .select("id, creator_id, fan_id")
    .eq("id", conversationId)
    .or(`creator_id.eq.${user.id},fan_id.eq.${user.id}`)
    .single();

  if (!convo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Fetch the message
  const { data: message } = await supabase
    .from("messages")
    .select("id, sender_id, conversation_id")
    .eq("id", messageId)
    .eq("conversation_id", conversationId)
    .single();

  if (!message) return NextResponse.json({ error: "Message not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const deleteFor: string = body.deleteFor;

  if (deleteFor !== "me" && deleteFor !== "everyone") {
    return NextResponse.json({ error: "Invalid deleteFor value" }, { status: 400 });
  }

  const isCreator = convo.creator_id === user.id;

  console.log("[DELETE msg] user:", user.id, "isCreator:", isCreator, "messageId:", messageId, "deleteFor:", deleteFor);

  if (deleteFor === "me") {
    // Soft-delete for current user only
    const field = isCreator ? "deleted_for_creator" : "deleted_for_fan";
    console.log("[DELETE msg] setting field:", field, "= true for message:", messageId);

    const { error, data: updateResult } = await supabase
      .from("messages")
      .update({ [field]: true })
      .eq("id", messageId)
      .select("id, deleted_for_creator, deleted_for_fan");

    console.log("[DELETE msg] update result:", updateResult, "error:", error);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, deleteFor: "me" });
  }

  // deleteFor === "everyone" — only the sender can do this
  if (message.sender_id !== user.id) {
    return NextResponse.json({ error: "Only the sender can delete for everyone" }, { status: 403 });
  }

  const { error } = await supabase
    .from("messages")
    .update({ is_deleted_for_everyone: true })
    .eq("id", messageId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, deleteFor: "everyone" });
}