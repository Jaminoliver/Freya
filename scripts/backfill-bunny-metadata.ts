// scripts/backfill-bunny-metadata.ts
// Run with: npx tsx scripts/backfill-bunny-metadata.ts

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL     = "https://fgeedvumuwbtuydosogb.supabase.co";
const SUPABASE_KEY     = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnZWVkdnVtdXdidHV5ZG9zb2diIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIzNDM4OSwiZXhwIjoyMDg2ODEwMzg5fQ.-xkN02Fg680p5zNGAiYfSWj9a3knXAPu1caItxyh2Lw";
const STREAM_LIBRARY   = "607042";
const STREAM_API_KEY   = "d61ba753-d04a-42b9-bf389a8bc3b9-fad1-4641";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function extractMetadata(video: Record<string, unknown>) {
  const width    = typeof video.width     === "number" && video.width     > 0 ? video.width     : null;
  const height   = typeof video.height    === "number" && video.height    > 0 ? video.height    : null;
  const fps      = typeof video.framerate === "number" && video.framerate > 0 ? video.framerate : null;
  const duration = typeof video.length    === "number" && video.length    > 0 ? video.length    : null;

  let bitrate: number | null = null;
  if (typeof video.storageSize === "number" && video.storageSize > 0 && duration) {
    bitrate = Math.round((video.storageSize * 8) / duration / 1000);
  }

  let aspect_ratio: number | null = null;
  if (width && height && height > 0) {
    aspect_ratio = Math.min(Math.max(width / height, 0.5), 2.0);
  }

  return { width, height, aspect_ratio, fps, bitrate, duration };
}

async function main() {
  // Fetch all media rows missing aspect_ratio but with a bunny_video_id
  const { data: rows, error } = await supabase
    .from("media")
    .select("id, bunny_video_id")
    .is("aspect_ratio", null)
    .not("bunny_video_id", "is", null);

  if (error) {
    console.error("Failed to fetch media rows:", error.message);
    process.exit(1);
  }

  console.log(`Found ${rows.length} rows to backfill`);

  let success = 0;
  let skipped = 0;
  let failed  = 0;

  for (const row of rows) {
    try {
      const res = await fetch(
        `https://video.bunnycdn.com/library/${STREAM_LIBRARY}/videos/${row.bunny_video_id}`,
        {
          headers: {
            AccessKey: STREAM_API_KEY,
            Accept:    "application/json",
          },
        }
      );

      if (!res.ok) {
        console.warn(`[SKIP] media.id=${row.id} — Bunny returned ${res.status}`);
        skipped++;
        continue;
      }

      const video = await res.json();

      // Only update if Bunny has finished encoding (status 4)
      if (video.status !== 4) {
        console.warn(`[SKIP] media.id=${row.id} — Bunny status=${video.status} (not finished)`);
        skipped++;
        continue;
      }

      const meta = extractMetadata(video);

      if (!meta.width || !meta.height) {
        console.warn(`[SKIP] media.id=${row.id} — no dimensions in Bunny response`);
        skipped++;
        continue;
      }

      const { error: updateError } = await supabase
        .from("media")
        .update({
          width:            meta.width,
          height:           meta.height,
          aspect_ratio:     meta.aspect_ratio,
          fps:              meta.fps,
          bitrate:          meta.bitrate,
          duration_seconds: meta.duration,
        })
        .eq("id", row.id);

      if (updateError) {
        console.error(`[FAIL] media.id=${row.id} — ${updateError.message}`);
        failed++;
      } else {
        console.log(`[OK]   media.id=${row.id} — ${meta.width}x${meta.height} ratio=${meta.aspect_ratio}`);
        success++;
      }

      // Small delay to avoid hammering Bunny API
      await new Promise((r) => setTimeout(r, 150));

    } catch (err) {
      console.error(`[FAIL] media.id=${row.id} —`, err);
      failed++;
    }
  }

  console.log(`\nDone. success=${success} skipped=${skipped} failed=${failed}`);
}

main();