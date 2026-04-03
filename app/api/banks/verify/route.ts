// app/api/banks/verify/route.ts
// Validates a bank account via Monnify name enquiry
// Returns the account name from the bank — never let users type this manually

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { validateBankAccount } from "@/lib/monnify/client";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { accountNumber, bankCode } = await req.json();

    if (!accountNumber || !bankCode) {
      return NextResponse.json({ error: "accountNumber and bankCode are required" }, { status: 400 });
    }

    if (accountNumber.length !== 10 || !/^\d{10}$/.test(accountNumber)) {
      return NextResponse.json({ error: "Account number must be exactly 10 digits" }, { status: 400 });
    }

    const result = await validateBankAccount(accountNumber, bankCode);

    return NextResponse.json({
      accountName: result.accountName,
      accountNumber: result.accountNumber,
      bankCode: result.bankCode,
    });
  } catch (error: any) {
    console.error("[Bank Verify] Error:", error);

    // Monnify returns specific errors for invalid accounts
    if (error?.status === 400 || error?.status === 404) {
      return NextResponse.json({ error: "Account not found. Please check the details." }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to verify account" }, { status: 500 });
  }
}