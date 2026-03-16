import { NextResponse } from "next/server";
import { createServerSupabaseClient, getUser } from "@/lib/supabase/server";

const PLATFORM_COMMISSION = 0.18;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { user, error: authError } = await getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const messageId = parseInt(id, 10);

  if (isNaN(messageId)) {
    return NextResponse.json({ error: "Invalid message id" }, { status: 400 });
  }

  // Fetch the message
  const { data: message, error: msgError } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, receiver_id, is_ppv, ppv_price, is_unlocked")
    .eq("id", messageId)
    .single();

  if (msgError || !message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  if (!message.is_ppv) {
    return NextResponse.json({ error: "Message is not PPV" }, { status: 400 });
  }

  if (message.is_unlocked) {
    return NextResponse.json({ error: "Message already unlocked" }, { status: 400 });
  }

  // Only the receiver (fan) can unlock
  if (message.receiver_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const price = message.ppv_price as number;

  // Check fan wallet balance
  const { data: balanceData, error: balanceError } = await supabase
    .rpc("get_wallet_balance", { p_user_id: user.id });

  if (balanceError) {
    return NextResponse.json({ error: "Failed to fetch wallet balance" }, { status: 500 });
  }

  const balance = balanceData as number ?? 0;

  if (balance < price) {
    return NextResponse.json({ error: "Insufficient wallet balance" }, { status: 402 });
  }

  const creatorShare = Math.floor(price * (1 - PLATFORM_COMMISSION));
  const platformFee  = price - creatorShare;
  const now          = new Date().toISOString();

  // Debit fan
  const { error: debitError } = await supabase.from("ledger").insert({
    user_id:            user.id,
    type:               "DEBIT",
    amount:             price,
    category:           "SUBSCRIPTION_PAYMENT",
    reference_id:       message.id,
    provider:           "INTERNAL",
    created_at:         now,
  });

  if (debitError) {
    return NextResponse.json({ error: "Failed to debit wallet" }, { status: 500 });
  }

  // Credit creator
  await supabase.from("ledger").insert({
    user_id:      message.sender_id,
    type:         "CREDIT",
    amount:       creatorShare,
    category:     "CREATOR_EARNING",
    reference_id: message.id,
    provider:     "INTERNAL",
    created_at:   now,
  });

  // Record platform fee
  await supabase.from("ledger").insert({
    user_id:      message.sender_id,
    type:         "DEBIT",
    amount:       platformFee,
    category:     "PLATFORM_FEE",
    reference_id: message.id,
    provider:     "INTERNAL",
    created_at:   now,
  });

  // Mark message as unlocked
  const { error: updateError } = await supabase
    .from("messages")
    .update({ is_unlocked: true })
    .eq("id", messageId);

  if (updateError) {
    return NextResponse.json({ error: "Failed to unlock message" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}