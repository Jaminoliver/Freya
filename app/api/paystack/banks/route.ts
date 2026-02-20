import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("https://api.paystack.co/bank?country=nigeria&currency=NGN&perPage=100", {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
      next: { revalidate: 86400 }, // cache for 24 hours
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch banks" }, { status: 502 });
    }

    const data = await res.json();

    if (!data.status) {
      return NextResponse.json({ error: "Paystack error" }, { status: 502 });
    }

    const seen = new Set<string>();
    const banks = data.data
      .filter((bank: { name: string; code: string }) => {
        if (seen.has(bank.code)) return false;
        seen.add(bank.code);
        return true;
      })
      .map((bank: { name: string; code: string }) => ({
        name: bank.name,
        code: bank.code,
      }));

    return NextResponse.json({ banks });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}