import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

const STREAM_LIBRARY = process.env.BUNNY_STREAM_LIBRARY_ID!;
const STREAM_API_KEY = process.env.BUNNY_STREAM_API_KEY!;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const service = createServiceSupabaseClient();

    // ── Step 1: Check Supabase first (webhook fast path) ─────────────
    const { data, error } = await service
      .from("media")
      .select("processing_status, bunny_video_id")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ status: "unknown" }, { status: 404 });
    }

    // Already completed or failed — return immediately
    if (data.processing_status === "completed" || data.processing_status === "failed") {
      return NextResponse.json({ status: data.processing_status });
    }

    // ── Step 2: Still processing — ask Bunny directly ────────────────
    if (data.bunny_video_id) {
      try {
        const bunnyRes = await fetch(
          `https://video.bunnycdn.com/library/${STREAM_LIBRARY}/videos/${data.bunny_video_id}`,
          {
            headers: {
              AccessKey: STREAM_API_KEY,
              Accept:    "application/json",
            },
          }
        );

        if (bunnyRes.ok) {
          const video = await bunnyRes.json();
          console.log("[Bunny Status] Raw response:", JSON.stringify(video));

          // Bunny status: 0=Created, 1=Uploaded, 2=Processing, 3=Transcoding, 4=Finished, 5=Error, 6=UploadFailed
          // availableResolutions being non-empty also means it's playable
          const isReady  = video.status === 4 || (video.availableResolutions && video.availableResolutions.length > 0);
          const isFailed = video.status === 5 || video.status === 6;

          if (isReady) {
            // Update Supabase so webhook isn't needed next time
            await service
              .from("media")
              .update({ processing_status: "completed" })
              .eq("id", id);

            return NextResponse.json({ status: "completed", encodeProgress: 100 });
          }

          if (isFailed) {
            await service
              .from("media")
              .update({ processing_status: "failed" })
              .eq("id", id);

            return NextResponse.json({ status: "failed" });
          }

          // Still encoding — return real progress
          return NextResponse.json({
            status:         "processing",
            encodeProgress: video.encodeProgress ?? 0,
          });
        }
      } catch {
        // Bunny API blip — fall through and return DB status
      }
    }

    // ── Fallback: return whatever DB has ─────────────────────────────
    return NextResponse.json({ status: data.processing_status });

  } catch (err) {
    return NextResponse.json({ status: "unknown" }, { status: 500 });
  }
}