// app/api/payout/accounts/route.ts
// GET — fetch creator's saved bank accounts
// POST — save a new verified bank account

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: accounts, error } = await supabase
      .from("creator_payout_accounts")
      .select("id, bank_name, bank_code, account_number, account_name, is_active, is_verified, created_at")
      .eq("creator_id", user.id)
      .order("is_active", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Payout Accounts GET] Error:", error);
      return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 });
    }

    const mapped = (accounts ?? []).map((a) => ({
      id: a.id,
      bank_name: a.bank_name,
      bank_code: a.bank_code,
      account_number: a.account_number,
      account_name: a.account_name,
      is_primary: a.is_active,
      is_verified: a.is_verified,
    }));

    return NextResponse.json({ accounts: mapped });
  } catch (error) {
    console.error("[Payout Accounts GET] Error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bankName, bankCode, accountNumber, accountName } = await req.json();

    if (!bankName || !bankCode || !accountNumber || !accountName) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (accountNumber.length !== 10 || !/^\d{10}$/.test(accountNumber)) {
      return NextResponse.json({ error: "Account number must be exactly 10 digits" }, { status: 400 });
    }

    const serviceSupabase = createServiceSupabaseClient();

    // Check if this account already exists for this creator
    const { data: existing } = await serviceSupabase
      .from("creator_payout_accounts")
      .select("id")
      .eq("creator_id", user.id)
      .eq("account_number", accountNumber)
      .eq("bank_code", bankCode)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "This account is already saved" }, { status: 409 });
    }

    // Check if creator has any existing accounts
    const { data: existingAccounts } = await serviceSupabase
      .from("creator_payout_accounts")
      .select("id")
      .eq("creator_id", user.id);

    const isFirst = !existingAccounts || existingAccounts.length === 0;

    // If this is not the first account, set all others to inactive
    if (isFirst) {
      // First account — will be set as active
    } else {
      await serviceSupabase
        .from("creator_payout_accounts")
        .update({ is_active: false })
        .eq("creator_id", user.id);
    }

    // Insert new account
    const { data: newAccount, error: insertError } = await serviceSupabase
      .from("creator_payout_accounts")
      .insert({
        creator_id: user.id,
        bank_name: bankName,
        bank_code: bankCode,
        account_number: accountNumber,
        account_name: accountName,
        is_verified: true,
        is_active: true,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[Payout Accounts POST] Insert error:", insertError);
      return NextResponse.json({ error: "Failed to save account" }, { status: 500 });
    }

    return NextResponse.json({ message: "Account saved", accountId: newAccount.id });
  } catch (error) {
    console.error("[Payout Accounts POST] Error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}