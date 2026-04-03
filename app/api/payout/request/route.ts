// app/api/payout/request/route.ts
// Creator requests a payout — validates balance, creates payout_request,
// initiates Monnify transfer

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";
import { initiateTransfer } from "@/lib/monnify/client";

const MIN_WITHDRAWAL_NAIRA = 5000;
const MIN_WITHDRAWAL_KOBO = MIN_WITHDRAWAL_NAIRA * 100;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { amount } = await req.json();

    // Amount from frontend is in naira
    if (!amount || typeof amount !== "number" || amount < MIN_WITHDRAWAL_NAIRA) {
      return NextResponse.json({ error: `Minimum withdrawal is ₦${MIN_WITHDRAWAL_NAIRA.toLocaleString()}` }, { status: 400 });
    }

    const amountKobo = Math.round(amount * 100);
    const serviceSupabase = createServiceSupabaseClient();

    // Calculate available earnings from ledger
    const { data: earnings } = await serviceSupabase
      .from("ledger")
      .select("amount")
      .eq("user_id", user.id)
      .eq("type", "CREDIT")
      .eq("category", "CREATOR_EARNING");

    const { data: payouts } = await serviceSupabase
      .from("ledger")
      .select("amount")
      .eq("user_id", user.id)
      .eq("type", "DEBIT")
      .eq("category", "PAYOUT");

    const totalEarned = (earnings ?? []).reduce((sum, e) => sum + e.amount, 0);
    const totalPaidOut = (payouts ?? []).reduce((sum, e) => sum + e.amount, 0);
    const availableKobo = totalEarned - totalPaidOut;

    if (amountKobo > availableKobo) {
      return NextResponse.json({ error: "Insufficient earnings balance" }, { status: 400 });
    }

    // Check for pending payouts
    const { data: pendingPayouts } = await serviceSupabase
      .from("payout_requests")
      .select("id")
      .eq("creator_id", user.id)
      .in("status", ["PENDING", "PROCESSING"]);

    if (pendingPayouts && pendingPayouts.length > 0) {
      return NextResponse.json({ error: "You have a pending payout. Please wait for it to complete." }, { status: 400 });
    }

    // Get active payout account
    const { data: payoutAccount } = await serviceSupabase
      .from("creator_payout_accounts")
      .select("id, bank_name, bank_code, account_number, account_name, is_verified, is_active, created_at, updated_at")
      .eq("creator_id", user.id)
      .eq("is_active", true)
      .eq("is_verified", true)
      .single();

    if (!payoutAccount) {
      return NextResponse.json({ error: "No verified payout account found. Please add one in settings." }, { status: 400 });
    }

    // Check 48hr cooling period on new accounts
    // Only applies if creator previously had a different account (removed/replaced)
    const accountAge = (Date.now() - new Date(payoutAccount.created_at).getTime()) / (1000 * 60 * 60);

    if (accountAge < 48) {
      // Check if any other account rows exist (soft-deleted or inactive)
      // If yes, this is a replacement account → cooling applies
      const { data: otherAccounts } = await serviceSupabase
        .from("creator_payout_accounts")
        .select("id")
        .eq("creator_id", user.id)
        .neq("id", payoutAccount.id)
        .limit(1);

      if (otherAccounts && otherAccounts.length > 0) {
        const hoursLeft = Math.ceil(48 - accountAge);
        return NextResponse.json({
          error: `For your security, new bank accounts require a 48-hour waiting period before payouts. You can request a payout in ${hoursLeft} hours.`,
        }, { status: 400 });
      }
    }

    // Generate unique reference
    const reference = `FRY-PAY-${user.id.slice(0, 8)}-${Date.now()}`;

    // Insert payout request as PENDING
    const { data: payoutRequest, error: insertError } = await serviceSupabase
      .from("payout_requests")
      .insert({
        creator_id: user.id,
        amount: amountKobo,
        status: "PENDING",
        monnify_transfer_ref: reference,
        bank_account_number: payoutAccount.account_number,
        bank_code: payoutAccount.bank_code,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[Payout Request] Insert error:", insertError);
      return NextResponse.json({ error: "Failed to create payout request" }, { status: 500 });
    }

    // Initiate Monnify transfer
    try {
      const transferResult = await initiateTransfer({
        amount: amountKobo,
        reference,
        narration: `Freya earnings payout - ${new Date().toLocaleDateString("en-NG")}`,
        bankCode: payoutAccount.bank_code,
        accountNumber: payoutAccount.account_number,
        accountName: payoutAccount.account_name,
      });

      // Update payout request with Monnify response
      await serviceSupabase
        .from("payout_requests")
        .update({
          status: "PROCESSING",
          monnify_transfer_ref: transferResult.reference || reference,
        })
        .eq("id", payoutRequest.id);

      console.log("[Payout Request] Transfer initiated:", {
        reference,
        amount: amountKobo,
        status: transferResult.status,
      });

      return NextResponse.json({
        message: "Payout initiated",
        payoutId: payoutRequest.id,
        reference,
      });
    } catch (transferError: any) {
      console.error("[Payout Request] Monnify transfer error:", transferError);

      // Mark payout as failed
      await serviceSupabase
        .from("payout_requests")
        .update({ status: "FAILED" })
        .eq("id", payoutRequest.id);

      return NextResponse.json({
        error: "Failed to initiate bank transfer. Please try again later.",
      }, { status: 500 });
    }
  } catch (error) {
    console.error("[Payout Request] Error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}