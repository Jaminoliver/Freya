// app/api/wallet/topup/virtual-account/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { initializeTransaction } from "@/lib/monnify/client";

async function getAccessToken(): Promise<string> {
  const credentials = Buffer.from(
    `${process.env.MONNIFY_API_KEY}:${process.env.MONNIFY_SECRET_KEY}`
  ).toString("base64");
  const response = await fetch(`${process.env.MONNIFY_BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/json" },
  });
  const data = await response.json();
  return data.responseBody.accessToken;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { amount } = body;

    if (!amount || amount < 500) {
      return NextResponse.json({ message: "Minimum top-up amount is ₦500" }, { status: 400 });
    }

    const amountKobo = Math.round(amount * 100);

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", user.id)
      .single();

    const email = profile?.email ?? user.email ?? "";
    const name  = profile?.full_name ?? "Freya User";
    const reference = `FRY-VA-${user.id.slice(0, 8)}-${Date.now()}`;

    const { error: insertError } = await supabase.from("transactions").insert({
      user_id:        user.id,
      fan_id:         user.id,
      provider:       "MONNIFY",
      provider_txn_id: reference,
      amount:         amountKobo,
      currency:       "NGN",
      status:         "pending",
      payment_method: "BANK_TRANSFER",
      purpose:        "WALLET_TOPUP",
      metadata:       { user_id: user.id, purpose: "WALLET_TOPUP" },
    });

    if (insertError) {
      console.error("[VA Topup] Failed to insert transaction:", insertError.message);
      return NextResponse.json({ message: "Failed to create transaction" }, { status: 500 });
    }

    const result = await initializeTransaction({
      amount:             amountKobo,
      customerName:       name,
      customerEmail:      email,
      paymentReference:   reference,
      paymentDescription: `Freya wallet top-up — ₦${amount.toLocaleString()}`,
      redirectUrl:        `${process.env.NEXT_PUBLIC_APP_URL}/wallet?ref=${reference}`,
      paymentMethods:     ["ACCOUNT_TRANSFER"],
      metadata:           { user_id: user.id, purpose: "WALLET_TOPUP" },
    });

    await supabase
      .from("transactions")
      .update({ monnify_transaction_ref: result.transactionReference })
      .eq("provider_txn_id", reference);

    // Fetch inline account details from Monnify
    try {
      const accessToken = await getAccessToken();
      const bankDetailsRes = await fetch(
        `${process.env.MONNIFY_BASE_URL}/api/v1/merchant/bank-transfer/init-payment`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ transactionReference: result.transactionReference }),
        }
      );
      const bankData = await bankDetailsRes.json();

      if (bankData.requestSuccessful && bankData.responseBody) {
        const bd = bankData.responseBody;
        return NextResponse.json({
          message:              "Bank transfer initialized",
          reference,
          transactionReference: result.transactionReference,
          accountNumber:        bd.accountNumber,
          bankName:             bd.bankName,
          accountName:          bd.accountName || "Freya Media",
          expiresAt:            bd.expiresOn   || null,
          amount,
          currency:             "NGN",
        });
      }
    } catch (bankErr) {
      console.error("[VA Topup] Inline bank details fetch failed:", bankErr);
    }

    // Fallback: return checkout URL
    return NextResponse.json({
      message:              "Bank transfer initialized",
      reference,
      transactionReference: result.transactionReference,
      checkoutUrl:          result.checkoutUrl,
      amount,
      currency:             "NGN",
    });
  } catch (error) {
    console.error("[VA Topup Error]", error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}