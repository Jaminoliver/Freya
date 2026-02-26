import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createBunnyVideo } from "@/lib/utils/bunny";

export const runtime = "nodejs";

// No file touches Vercel — we only create the Bunny video object
// and hand back credentials so the client uploads directly to Bunny.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { title } = await req.json();

    // Create the video object in Bunny Stream
    const videoId = await createBunnyVideo(title || "Untitled");

    // Return everything the client needs to PUT directly to Bunny
    return NextResponse.json({
      videoId,
      libraryId: process.env.BUNNY_STREAM_LIBRARY_ID!,
      apiKey:    process.env.BUNNY_STREAM_API_KEY!,
    });

  } catch (err) {
    console.error("[Upload Video] Error:", err);
    return NextResponse.json({ error: "Failed to initialise upload" }, { status: 500 });
  }
}