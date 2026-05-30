import { createClient } from "@supabase/supabase-js";

const service = createClient(
  "https://fgeedvumuwbtuydosogb.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnZWVkdnVtdXdidHV5ZG9zb2diIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIzNDM4OSwiZXhwIjoyMDg2ODEwMzg5fQ.-xkN02Fg680p5zNGAiYfSWj9a3knXAPu1caItxyh2Lw"
);

const BUNNY_STREAM_LIBRARY_ID = "607042";
const BUNNY_STREAM_API_KEY = "d61ba753-d04a-42b9-bf389a8bc3b9-fad1-4641";

async function cleanupOrphanVideos() {
  // 1. Fetch all bunny_video_ids from your media table
  const { data: mediaRows, error } = await service
    .from("media")
    .select("bunny_video_id")
    .not("bunny_video_id", "is", null);

  if (error) {
    console.error("Failed to fetch media table:", error);
    return;
  }

  const knownVideoIds = new Set(mediaRows.map((r) => r.bunny_video_id));
  console.log(`Found ${knownVideoIds.size} video IDs in database.`);

  // 2. Fetch all videos from Bunny
  let page = 1;
  let orphansDeleted = 0;
  let failed = 0;
  let skipped = 0;

  while (true) {
    const res = await fetch(
      `https://video.bunnycdn.com/library/${BUNNY_STREAM_LIBRARY_ID}/videos?page=${page}&itemsPerPage=100&orderBy=date`,
      { headers: { AccessKey: BUNNY_STREAM_API_KEY } }
    );
    const data = await res.json() as any;
    const videos = data.items ?? [];
    if (videos.length === 0) break;

    for (const video of videos) {
      if (knownVideoIds.has(video.guid)) {
        skipped++;
      } else {
        // Not in DB — orphan, delete it
        const del = await fetch(
          `https://video.bunnycdn.com/library/${BUNNY_STREAM_LIBRARY_ID}/videos/${video.guid}`,
          { method: "DELETE", headers: { AccessKey: BUNNY_STREAM_API_KEY } }
        );
        if (del.ok) {
          console.log(`Deleted orphan: ${video.title} (${video.guid})`);
          orphansDeleted++;
        } else {
          console.warn(`Failed to delete: ${video.title} (${video.guid})`);
          failed++;
        }
      }
    }

    if (videos.length < 100) break;
    page++;
  }

  console.log(`\nDone.`);
  console.log(`Kept (in DB): ${skipped}`);
  console.log(`Deleted (orphans): ${orphansDeleted}`);
  console.log(`Failed: ${failed}`);
}

cleanupOrphanVideos();