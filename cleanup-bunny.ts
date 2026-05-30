import { createClient } from "@supabase/supabase-js";

const service = createClient(
  "https://fgeedvumuwbtuydosogb.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnZWVkdnVtdXdidHV5ZG9zb2diIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIzNDM4OSwiZXhwIjoyMDg2ODEwMzg5fQ.-xkN02Fg680p5zNGAiYfSWj9a3knXAPu1caItxyh2Lw"
);

const BUNNY_STORAGE_ZONE = "freya-media";
const BUNNY_API_KEY = "2b3dc962-b26d-440a-b504aa353c85-e940-4c08";

async function cleanupBunnyFiles() {
  const { data: deletedPosts } = await service
    .from("posts")
    .select("id")
    .eq("is_deleted", true);

  const deletedPostIds = (deletedPosts ?? []).map((p) => p.id);

  if (deletedPostIds.length === 0) {
    console.log("No deleted posts found.");
    return;
  }

  const { data: mediaFiles, error } = await service
    .from("media")
    .select("id, file_url, thumbnail_url, raw_video_url, post_id")
    .in("post_id", deletedPostIds);

  if (error) {
    console.error("Failed to fetch media:", error);
    return;
  }

  if (!mediaFiles || mediaFiles.length === 0) {
    console.log("No orphaned files found.");
    return;
  }

  console.log(`Found ${mediaFiles.length} media rows to clean up...`);

  let deleted = 0;
  let failed = 0;

  for (const file of mediaFiles) {
    const urls = [file.file_url, file.thumbnail_url, file.raw_video_url].filter(Boolean) as string[];

    // Extract Bunny Stream video ID from CDN URL
    const streamCdnHost = "vz-8bc100f4-3c0.b-cdn.net";
    const BUNNY_STREAM_LIBRARY_ID = "607042";
    const BUNNY_STREAM_API_KEY = "d61ba753-d04a-42b9-bf389a8bc3b9-fad1-4641";

    for (const url of urls) {
      try {
        const parsed = new URL(url);
        if (parsed.hostname === streamCdnHost) {
          // Stream video — delete via Stream API using video ID (first path segment)
          const videoId = parsed.pathname.split("/").filter(Boolean)[0];
          if (!videoId) { failed++; continue; }
          const res = await fetch(
            `https://video.bunnycdn.com/library/${BUNNY_STREAM_LIBRARY_ID}/videos/${videoId}`,
            {
              method: "DELETE",
              headers: { AccessKey: BUNNY_STREAM_API_KEY },
            }
          );
          if (res.ok) {
            deleted++;
          } else {
            console.warn(`Failed (${res.status}): ${url}`);
            failed++;
          }
        } else {
          // Storage file
          const filePath = parsed.pathname;
          const res = await fetch(
            `https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}${filePath}`,
            {
              method: "DELETE",
              headers: { AccessKey: BUNNY_API_KEY },
            }
          );
          if (res.ok) {
            deleted++;
          } else {
            console.warn(`Failed (${res.status}): ${url}`);
            failed++;
          }
        }
      } catch (err) {
        console.error(`Error deleting ${url}:`, err);
        failed++;
      }
    }
  }

  console.log(`Done. Deleted: ${deleted}, Failed: ${failed}`);
}

cleanupBunnyFiles();