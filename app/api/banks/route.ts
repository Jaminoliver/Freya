import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("https://api.paystack.co/bank?country=nigeria&perPage=100", {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
      next: { revalidate: 86400 }, // cache for 24 hours
    });

    const data = await res.json();

    if (!res.ok || !data.status) {
      return NextResponse.json({ error: "Failed to fetch banks" }, { status: 500 });
    }

    const banks = data.data.map((b: { name: string; code: string }) => ({
      name: b.name,
      code: b.code,
    }));

    return NextResponse.json({ banks });
  } catch (err) {
    console.error("[Banks Error]", err);
    return NextResponse.json({ error: "Failed to fetch banks" }, { status: 500 });
  }
}