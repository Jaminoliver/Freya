import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const account_number = searchParams.get("account_number");
  const bank_code = searchParams.get("bank_code");

  if (!account_number || !bank_code) {
    return NextResponse.json({ error: "account_number and bank_code are required" }, { status: 400 });
  }

  if (account_number.length !== 10) {
    return NextResponse.json({ error: "Account number must be 10 digits" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const data = await res.json();

    if (!res.ok || !data.status) {
      return NextResponse.json({ error: "Could not resolve account. Check your details." }, { status: 422 });
    }

    return NextResponse.json({ account_name: data.data.account_name });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}