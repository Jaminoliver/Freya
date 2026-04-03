// app/api/banks/route.ts
// Returns list of Nigerian banks from Monnify
// Cached in memory for 24 hours to avoid hitting Monnify on every request

import { NextResponse } from "next/server";
import { getBanks } from "@/lib/monnify/client";

let cachedBanks: { name: string; code: string }[] | null = null;
let cacheExpiry = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export async function GET() {
  try {
    const now = Date.now();

    if (cachedBanks && cacheExpiry > now) {
      return NextResponse.json({ banks: cachedBanks });
    }

    const banks = await getBanks();

    // Sort alphabetically and map to simple format
    const sorted = banks
      .map((b) => ({ name: b.name, code: b.code }))
      .sort((a, b) => a.name.localeCompare(b.name));

    cachedBanks = sorted;
    cacheExpiry = now + CACHE_DURATION;

    return NextResponse.json({ banks: sorted });
  } catch (error) {
    console.error("[Banks API] Error:", error);
    return NextResponse.json({ error: "Failed to fetch banks" }, { status: 500 });
  }
}