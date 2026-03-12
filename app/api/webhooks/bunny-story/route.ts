import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[bunny-story webhook] Received:", JSON.stringify(body));

    const { VideoGuid, Status } = body;

    if (!VideoGuid) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const supabase = createServiceSupabaseClient();

    if (Status === 4) {
      const { data: story } = await supabase
        .from("stories")
        .select("id")
        .eq("bunny_video_id", VideoGuid)
        .single();

      if (story) {
        const { error } = await supabase
          .from("stories")
          .update({ is_processing: false })
          .eq("id", story.id);

        if (error) {
          console.error("[bunny-story webhook] DB update error:", error.message);
        } else {
          console.log(`[bunny-story webhook] ✓ Story ${story.id} marked ready`);
        }
      } else {
        console.log(`[bunny-story webhook] No story found for VideoGuid: ${VideoGuid}`);
      }
    }

    if (Status === 5) {
      console.error(`[bunny-story webhook] Encoding failed for VideoGuid: ${VideoGuid}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });

  } catch (err) {
    console.error("[bunny-story webhook] Unexpected error:", err);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}