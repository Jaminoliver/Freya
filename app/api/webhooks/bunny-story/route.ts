import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const receivedAt = new Date().toISOString();
  console.log(`[bunny-webhook] ── RECEIVED at ${receivedAt} ──────────────────`);

  try {
    // Log raw headers so we can confirm Bunny is actually hitting this endpoint
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => { headers[key] = value; });
    console.log(`[bunny-webhook] Headers:`, JSON.stringify(headers));

    const rawBody = await req.text();
    console.log(`[bunny-webhook] Raw body:`, rawBody);

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch (parseErr) {
      console.error(`[bunny-webhook] ✗ Failed to parse JSON body:`, parseErr);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    console.log(`[bunny-webhook] Parsed body:`, JSON.stringify(body));

    const { VideoGuid, Status } = body as { VideoGuid?: string; Status?: number };

    console.log(`[bunny-webhook] VideoGuid: ${VideoGuid ?? "MISSING"}`);
    console.log(`[bunny-webhook] Status: ${Status ?? "MISSING"} (type: ${typeof Status})`);

    if (!VideoGuid) {
      console.warn(`[bunny-webhook] ✗ No VideoGuid in payload — ignoring`);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const supabase = createServiceSupabaseClient();

    // Always do the DB lookup regardless of status, so we can see if the VideoGuid is even stored
    console.log(`[bunny-webhook] Looking up story with bunny_video_id = ${VideoGuid}`);
    const { data: story, error: lookupErr } = await supabase
      .from("stories")
      .select("id, is_processing, bunny_video_id")
      .eq("bunny_video_id", VideoGuid)
      .single();

    if (lookupErr) {
      console.error(`[bunny-webhook] ✗ DB lookup error:`, lookupErr.message, lookupErr.code);
    }

    if (!story) {
      console.warn(`[bunny-webhook] ✗ No story found for VideoGuid: ${VideoGuid}`);
      console.warn(`[bunny-webhook] This means either bunny_video_id was not saved correctly, or the VideoGuid in the webhook doesn't match what was stored`);
    } else {
      console.log(`[bunny-webhook] ✓ Story found — id: ${story.id}, is_processing: ${story.is_processing}, stored bunny_video_id: ${story.bunny_video_id}`);
    }

    // Status 4 = encoding complete
    if (Status === 4) {
      console.log(`[bunny-webhook] Status 4 received — transcoding complete`);

      if (story) {
        console.log(`[bunny-webhook] Updating story ${story.id} → is_processing = false`);
        const { error: updateErr } = await supabase
          .from("stories")
          .update({ is_processing: false })
          .eq("id", story.id);

        if (updateErr) {
          console.error(`[bunny-webhook] ✗ DB update error:`, updateErr.message, updateErr.code);
        } else {
          console.log(`[bunny-webhook] ✓ Story ${story.id} marked ready`);
        }
      } else {
        console.error(`[bunny-webhook] ✗ Cannot update — no story matched VideoGuid: ${VideoGuid}`);
      }
    } else if (Status === 5) {
      console.error(`[bunny-webhook] ✗ Bunny encoding FAILED for VideoGuid: ${VideoGuid}`);
      if (story) {
        // Mark as failed so the UI can surface the error instead of polling forever
        await supabase
          .from("stories")
          .update({ is_processing: false })
          .eq("id", story.id);
        console.log(`[bunny-webhook] Marked story ${story.id} as not-processing after encode failure`);
      }
    } else {
      console.log(`[bunny-webhook] Status ${Status} — not a terminal state, no action taken`);
    }

    console.log(`[bunny-webhook] ── DONE ────────────────────────────────────`);
    return NextResponse.json({ received: true }, { status: 200 });

  } catch (err) {
    console.error(`[bunny-webhook] ✗ Unexpected error:`, err);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}