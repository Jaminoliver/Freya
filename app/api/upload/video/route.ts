import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createBunnyVideo } from "@/lib/utils/bunny";

export const runtime    = "nodejs";
export const maxDuration = 300; // 5 min — large video files need time

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file     = formData.get("file") as File | null;
    const title    = (formData.get("title") as string) || "Untitled";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Step 1: Create video object in Bunny
    const videoId = await createBunnyVideo(title);

    // Step 2: Proxy upload to Bunny from server (no browser→Bunny connection needed)
    const STREAM_LIBRARY = process.env.BUNNY_STREAM_LIBRARY_ID!;
    const STREAM_API_KEY = process.env.BUNNY_STREAM_API_KEY!;

    const buffer   = await file.arrayBuffer();
    const bunnyRes = await fetch(
      `https://video.bunnycdn.com/library/${STREAM_LIBRARY}/videos/${videoId}`,
      {
        method:  "PUT",
        headers: {
          AccessKey:      STREAM_API_KEY,
          "Content-Type": file.type || "video/mp4",
        },
        body: buffer,
      }
    );

    if (!bunnyRes.ok) {
      const text = await bunnyRes.text();
      throw new Error(`Bunny upload failed: ${bunnyRes.status} — ${text}`);
    }

    return NextResponse.json({ videoId });

  } catch (err) {
    console.error("[Upload Video] Error:", err);
    return NextResponse.json({ error: "Failed to upload video" }, { status: 500 });
  }
}