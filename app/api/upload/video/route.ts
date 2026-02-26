import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createBunnyVideo, getBunnyUploadUrl } from "@/lib/utils/bunny";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { title } = await req.json();

    // Create video object in Bunny Stream
    const videoId = await createBunnyVideo(title || "Untitled");

    // Return direct upload URL — browser uploads straight to Bunny
    const { uploadUrl, headers } = getBunnyUploadUrl(videoId);

    return NextResponse.json({ videoId, uploadUrl, headers });

  } catch (err) {
    console.error("[Upload Video] Error:", err);
    return NextResponse.json({ error: "Failed to create video" }, { status: 500 });
  }
}