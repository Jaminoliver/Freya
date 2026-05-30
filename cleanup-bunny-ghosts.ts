// fetch is built-in on Node 18+

const BUNNY_STREAM_LIBRARY_ID = "607042";
const BUNNY_STREAM_API_KEY = "d61ba753-d04a-42b9-bf389a8bc3b9-fad1-4641";

async function cleanupGhostVideos() {
  let page = 1;
  let deleted = 0;
  let failed = 0;

  while (true) {
    const res = await fetch(
      `https://video.bunnycdn.com/library/${BUNNY_STREAM_LIBRARY_ID}/videos?page=${page}&itemsPerPage=100&orderBy=date`,
      { headers: { AccessKey: BUNNY_STREAM_API_KEY } }
    );
    const data = await res.json() as any;
    const videos = data.items ?? [];
    if (videos.length === 0) break;

    for (const video of videos) {
      if (video.storageSize === 0) console.log(`${video.title} | status: ${video.status}`);
      if (video.storageSize === 0 && (video.status === 0 || video.status === 3)) {
        const del = await fetch(
          `https://video.bunnycdn.com/library/${BUNNY_STREAM_LIBRARY_ID}/videos/${video.guid}`,
          { method: "DELETE", headers: { AccessKey: BUNNY_STREAM_API_KEY } }
        );
        if (del.ok) {
          console.log(`Deleted ghost: ${video.title} (${video.guid})`);
          deleted++;
        } else {
          console.warn(`Failed: ${video.title} (${video.guid})`);
          failed++;
        }
      }
    }

    if (videos.length < 100) break;
    page++;
  }

  console.log(`Done. Deleted: ${deleted}, Failed: ${failed}`);
}

cleanupGhostVideos();