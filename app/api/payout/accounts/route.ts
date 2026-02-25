import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET — fetch creator's saved bank accounts
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("bank_accounts")
      .select("*")
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ accounts: data ?? [] });
  } catch (err) {
    console.error("[Payout Accounts GET Error]", err);
    return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 });
  }
}

// POST — upsert bank account (only one allowed per creator)
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

    // Check if creator already has an account
    const { data: existing } = await supabase
      .from("bank_accounts")
      .select("id")
      .eq("creator_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    let data, error;

    if (existing) {
      // Update existing account
      ({ data, error } = await supabase
        .from("bank_accounts")
        .update({
          bank_name: bankName,
          bank_code: bankCode,
          account_number: accountNumber,
          account_name: accountName,
          is_verified: true,
          is_active: true,
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single());
    } else {
      // Insert first account — always primary
      ({ data, error } = await supabase
        .from("bank_accounts")
        .insert({
          creator_id: user.id,
          bank_name: bankName,
          bank_code: bankCode,
          account_number: accountNumber,
          account_name: accountName,
          is_primary: true,
          is_verified: true,
          is_active: true,
          verified_at: new Date().toISOString(),
        })
        .select()
        .single());
    }

    if (error) throw error;

    return NextResponse.json({ account: data });
  } catch (err) {
    console.error("[Payout Setup Error]", err);
    return NextResponse.json({ error: "Failed to save account" }, { status: 500 });
  }
}