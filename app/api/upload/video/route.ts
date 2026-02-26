import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createBunnyVideo, getBunnyTusCredentials } from "@/lib/utils/bunny";

export const runtime = "nodejs";

// No file touches Vercel — we only create the Bunny video object
// and return presigned TUS credentials for direct browser → Bunny upload.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { title } = await req.json();

    // Step 1: Create video object in Bunny Stream
    const videoId = await createBunnyVideo(title || "Untitled");

    // Step 2: Generate presigned TUS credentials (API key never leaves server)
    const { tusEndpoint, expireTime, signature, libraryId } = getBunnyTusCredentials(videoId);

    return NextResponse.json({
      videoId,
      tusEndpoint,
      expireTime,
      signature,
      libraryId,
    });

  } catch (err) {
    console.error("[Upload Video] Error:", err);
    return NextResponse.json({ error: "Failed to initialise upload" }, { status: 500 });
  }
}