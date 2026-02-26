import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const STREAM_LIBRARY = process.env.BUNNY_STREAM_LIBRARY_ID!;
const STREAM_API_KEY = process.env.BUNNY_STREAM_API_KEY!;

export async function POST(
  req: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { videoId } = params;
    if (!videoId) return NextResponse.json({ error: "videoId required" }, { status: 400 });

    const formData = await req.formData();
    const file     = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());

    // Bunny Stream native thumbnail upload
    const res = await fetch(
      `https://video.bunnycdn.com/library/${STREAM_LIBRARY}/videos/${videoId}/thumbnail`,
      {
        method:  "POST",
        headers: {
          AccessKey:      STREAM_API_KEY,
          "Content-Type": "image/*",
        },
        body: new Uint8Array(buffer),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("[Video Thumbnail] Bunny error:", res.status, text);
      return NextResponse.json({ error: "Failed to set thumbnail" }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("[Video Thumbnail] Error:", err);
    return NextResponse.json({ error: "Thumbnail upload failed" }, { status: 500 });
  }
}