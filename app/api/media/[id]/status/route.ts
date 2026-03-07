import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { extractBunnyMetadata } from "@/lib/utils/bunnyMetadata";

const STREAM_LIBRARY = process.env.BUNNY_STREAM_LIBRARY_ID!;
const STREAM_API_KEY = process.env.BUNNY_STREAM_API_KEY!;

async function triggerReencode(bunnyVideoId: string): Promise<void> {
  try {
    await fetch(
      `https://video.bunnycdn.com/library/${STREAM_LIBRARY}/videos/${bunnyVideoId}/reencode`,
      {
        method:  "POST",
        headers: {
          AccessKey: STREAM_API_KEY,
          Accept:    "application/json",
        },
      }
    );
    console.log(`[Bunny Status] Re-encode triggered for ${bunnyVideoId}`);
  } catch (err) {
    console.error(`[Bunny Status] Re-encode trigger failed for ${bunnyVideoId}:`, err);
  }
}

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
          const isReady  = video.status === 4 || (video.availableResolutions && video.availableResolutions.length > 0);
          const isFailed = video.status === 5 || video.status === 6;

          if (isReady) {
            const meta = extractBunnyMetadata(video);

            await service
              .from("media")
              .update({
                processing_status: "completed",
                width:             meta.width,
                height:            meta.height,
                aspect_ratio:      meta.aspect_ratio,
                fps:               meta.fps,
                bitrate:           meta.bitrate,
                duration_seconds:  meta.duration,
              })
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

          if (video.dateUploaded) {
            const uploadedAt = new Date(video.dateUploaded).getTime();
            const ageMs      = Date.now() - uploadedAt;

            // ── Stuck at status 0 (Created) — not yet queued ──────────
            // Trigger re-encode after 2 minutes
            if (video.status === 0 && ageMs > 2 * 60 * 1000) {
              console.log(`[Bunny Status] Video ${data.bunny_video_id} stuck at status 0 for ${Math.round(ageMs / 1000)}s — triggering re-encode`);
              await triggerReencode(data.bunny_video_id);
            }

            // ── Stuck at status 2 (Processing) with 0 progress ────────
            // Encoding was queued but the job stalled — trigger re-encode after 60 seconds
            if (video.status === 2 && video.encodeProgress === 0 && ageMs > 60 * 1000) {
              console.log(`[Bunny Status] Video ${data.bunny_video_id} stuck at status 2 / encodeProgress 0 for ${Math.round(ageMs / 1000)}s — triggering re-encode`);
              await triggerReencode(data.bunny_video_id);
            }
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