import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { videoId } = await req.json();
    if (!videoId) return NextResponse.json({ error: "Missing videoId" }, { status: 400 });

    const res = await fetch(
      `https://video.bunnycdn.com/library/${process.env.BUNNY_STREAM_LIBRARY_ID}/videos/${videoId}`,
      {
        method: "DELETE",
        headers: { AccessKey: process.env.BUNNY_STREAM_API_KEY! },
      }
    );

    if (!res.ok) {
      console.error(`[cleanup] Failed to delete Bunny video ${videoId}: ${res.status}`);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[cleanup] Error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}