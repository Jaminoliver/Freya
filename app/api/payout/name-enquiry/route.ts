import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { accountNumber, bankCode } = await req.json();

    if (!accountNumber || !bankCode) {
      return NextResponse.json({ error: "Account number and bank code are required" }, { status: 400 });
    }

    const res = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const data = await res.json();

    if (!res.ok || !data.status) {
      return NextResponse.json(
        { error: data.message || "Could not resolve account name" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      accountName: data.data.account_name,
      accountNumber: data.data.account_number,
    });
  } catch (err) {
    console.error("[Name Enquiry Error]", err);
    return NextResponse.json({ error: "Failed to resolve account" }, { status: 500 });
  }
}