import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";
import { generatePayOnUsReference, initiateBankTransfer } from "@/lib/utils/payonus";

const MIN_PAYOUT   = 5000;
const WEBHOOK_URL  = process.env.NEXT_PUBLIC_APP_URL + "/api/webhooks/payonus";
const IS_SANDBOX   = process.env.PAYONUS_BASE_URL?.includes("sandbox");

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { amount } = await req.json();
    const numAmount = Number(amount);

    if (!numAmount || numAmount < MIN_PAYOUT) {
      return NextResponse.json(
        { error: `Minimum withdrawal is ${MIN_PAYOUT.toLocaleString()}` },
        { status: 400 }
      );
    }

    // Check available balance
    const service = createServiceSupabaseClient();

    const { data: credits } = await service
      .from("ledger_entries").select("amount")
      .eq("user_id", user.id).eq("category", "CREATOR_EARNING").eq("type", "CREDIT");

    const { data: debits } = await service
      .from("ledger_entries").select("amount")
      .eq("user_id", user.id).eq("category", "PAYOUT").eq("type", "DEBIT");

    const totalEarned = (credits ?? []).reduce((s: number, r: { amount: string }) => s + Number(r.amount), 0);
    const totalPaid   = (debits  ?? []).reduce((s: number, r: { amount: string }) => s + Number(r.amount), 0);
    const available   = Math.max(0, totalEarned - totalPaid);

    if (numAmount > available) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    // Fetch verified bank account
    const { data: bankAccount } = await supabase
      .from("bank_accounts")
      .select("id, bank_name, bank_code, account_number, account_name")
      .eq("creator_id", user.id)
      .eq("is_verified", true)
      .eq("is_active", true)
      .maybeSingle();

    if (!bankAccount) {
      return NextResponse.json(
        { error: "No verified bank account found. Please add one in Payout Settings." },
        { status: 400 }
      );
    }

    // Block duplicate pending payout
    const { data: pending } = await supabase
      .from("payout_requests")
      .select("id")
      .eq("creator_id", user.id)
      .eq("status", "PENDING")
      .maybeSingle();

    if (pending) {
      return NextResponse.json(
        { error: "You already have a pending payout request." },
        { status: 409 }
      );
    }

    // Fetch creator email
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", user.id)
      .single();

    const email     = profile?.email ?? user.email ?? "";
    const reference = generatePayOnUsReference("PAYOUT");

    let onusReference: string | null = null;

    if (IS_SANDBOX) {
      // Sandbox: skip PayOnUs transfer call — save directly as PENDING
      // Use test-payonus-payout.ts script to simulate webhook approval
      console.log("[Payout Request] Sandbox mode — skipping PayOnUs transfer call");
      onusReference = "SANDBOX-" + reference;
    } else {
      // Production: call PayOnUs transfer API
      console.log("[Payout Request] Calling PayOnUs transfer", { amount: numAmount, reference });
      try {
        const transferResult = await initiateBankTransfer({
          reference,
          amount:                   numAmount,
          beneficiaryAccountNumber: bankAccount.account_number,
          beneficiaryAccountName:   bankAccount.account_name,
          beneficiaryBankCode:      bankAccount.bank_code,
          email,
          notificationUrl:          WEBHOOK_URL,
        });
        console.log("[Payout Request] PayOnUs response:", JSON.stringify(transferResult, null, 2));
        onusReference = transferResult.onusReference ?? null;
      } catch (err) {
        console.error("[Payout Request] PayOnUs transfer error:", err);
        return NextResponse.json(
          { error: err instanceof Error ? err.message : "Transfer failed. Please try again." },
          { status: 400 }
        );
      }
    }

    // Save payout_requests row
    const { data: payoutRow, error: insertError } = await supabase
      .from("payout_requests")
      .insert({
        creator_id:          user.id,
        amount:              numAmount,
        status:              "PENDING",
        kyshi_transfer_code: onusReference,
        bank_account_number: bankAccount.account_number,
        bank_code:           bankAccount.bank_code,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[Payout Request] Insert error:", insertError.message);
      return NextResponse.json({ error: "Payout initiated but failed to save record." }, { status: 500 });
    }

    console.log("[Payout Request] Saved payout row:", payoutRow.id);

    return NextResponse.json({
      success:      true,
      payoutId:     payoutRow.id,
      reference,
      onusReference,
      status:       "PENDING",
    });

  } catch (err) {
    console.error("[Payout Request] Error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}