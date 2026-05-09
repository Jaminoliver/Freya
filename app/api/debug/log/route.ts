import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[CLIENT_DEBUG]", JSON.stringify(body));
  } catch {}
  return NextResponse.json({ ok: true });
}