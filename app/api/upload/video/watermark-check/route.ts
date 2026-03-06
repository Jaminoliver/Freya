import { NextRequest, NextResponse } from "next/server";

const STREAM_LIBRARY = process.env.BUNNY_STREAM_LIBRARY_ID!;
const STREAM_API_KEY = process.env.BUNNY_STREAM_API_KEY!;

export async function GET(req: NextRequest) {
  const videoId = req.nextUrl.searchParams.get("videoId");
  if (!videoId) return NextResponse.json({ error: "videoId required" }, { status: 400 });

  try {
    const res  = await fetch(`https://video.bunnycdn.com/library/${STREAM_LIBRARY}/videos/${videoId}`, {
      headers: { AccessKey: STREAM_API_KEY },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[watermark-check] Bunny API error: ${res.status} — ${text}`);
      return NextResponse.json({ error: "Failed to fetch video from Bunny" }, { status: 500 });
    }

    const data = await res.json();

    const result = {
      videoId,
      hasWatermark:    data.hasWatermark     ?? null,
      watermarkVersion: data.watermarkVersion ?? null,
      status:          data.status           ?? null,
      encodeProgress:  data.encodeProgress   ?? null,
    };

    console.log(`[watermark-check] videoId=${videoId}`, result);

    return NextResponse.json(result);
  } catch (err) {
    console.error("[watermark-check] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}