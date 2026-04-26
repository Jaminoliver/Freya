import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  console.error("[iOS Client Error]", JSON.stringify(body));
  return NextResponse.json({ ok: true });
}