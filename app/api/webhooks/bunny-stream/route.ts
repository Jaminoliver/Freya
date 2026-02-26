import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

// Bunny Stream webhook status codes
// 1 = Queued, 2 = Processing, 3 = Encoding, 4 = Resolution finished (first = now playable)
// 5 = Failed, 6 = PresignedUploadStarted, 7 = PresignedUploadFinished, 8 = PresignedUploadFailed

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log("[Bunny Webhook] Received:", JSON.stringify(body));

    const { VideoGuid, Status, VideoLibraryId } = body;

    if (!VideoGuid) {
      return NextResponse.json({ error: "Missing VideoGuid" }, { status: 400 });
    }

    // Status 4 = first resolution finished = video is now playable
    // Status 5 = failed
    if (Status === 4) {
      // Video is now playable — mark as completed
      const service = createServiceSupabaseClient();

      const { error } = await service
        .from("media")
        .update({ processing_status: "completed" })
        .eq("bunny_video_id", VideoGuid);

      if (error) {
        console.error("[Bunny Webhook] DB update error:", error.message);
        return NextResponse.json({ error: "DB update failed" }, { status: 500 });
      }

      console.log(`[Bunny Webhook] Video ${VideoGuid} marked as completed`);
    }

    if (Status === 5) {
      // Encoding failed
      const service = createServiceSupabaseClient();

      await service
        .from("media")
        .update({ processing_status: "failed" })
        .eq("bunny_video_id", VideoGuid);

      console.log(`[Bunny Webhook] Video ${VideoGuid} marked as failed`);
    }

    // Always return 200 — Bunny retries if it doesn't get 200
    return NextResponse.json({ received: true }, { status: 200 });

  } catch (err) {
    console.error("[Bunny Webhook] Error:", err);
    // Still return 200 to prevent Bunny from retrying a bad payload
    return NextResponse.json({ received: true }, { status: 200 });
  }
}