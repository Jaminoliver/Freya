import { createClient } from "@supabase/supabase-js";

const service = createClient(
  "https://fgeedvumuwbtuydosogb.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnZWVkdnVtdXdidHV5ZG9zb2diIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIzNDM4OSwiZXhwIjoyMDg2ODEwMzg5fQ.-xkN02Fg680p5zNGAiYfSWj9a3knXAPu1caItxyh2Lw"
);

const BUNNY_STORAGE_ZONE    = "freya-media";
const BUNNY_STORAGE_API_KEY = "2b3dc962-b26d-440a-b504aa353c85-e940-4c08";

async function cleanupMessageMedia() {
  // Get all conversations that are deleted for everyone
  const { data: deletedConvos, error: convError } = await service
    .from("conversations")
    .select("id")
    .eq("deleted_for_creator", true)
    .eq("deleted_for_fan", true);

  if (convError) {
    console.error("Failed to fetch conversations:", convError);
    return;
  }

  if (!deletedConvos || deletedConvos.length === 0) {
    console.log("No fully deleted conversations found.");
    return;
  }

  console.log(`Found ${deletedConvos.length} deleted conversations.`);

  const convIds = deletedConvos.map((c) => c.id);

  // Get all message IDs from those conversations
  const { data: messages } = await service
    .from("messages")
    .select("id")
    .in("conversation_id", convIds);

  const messageIds = (messages ?? []).map((m) => m.id);

  if (messageIds.length === 0) {
    console.log("No messages found in deleted conversations.");
    return;
  }

  // Get all media from those messages
  const { data: mediaFiles } = await service
    .from("message_media")
    .select("url")
    .in("message_id", messageIds);

  if (!mediaFiles || mediaFiles.length === 0) {
    console.log("No message media found to clean up.");
    return;
  }

  console.log(`Found ${mediaFiles.length} media files to delete...`);

  let deleted = 0;
  let failed  = 0;

  for (const { url } of mediaFiles) {
    try {
      const filePath = new URL(url).pathname;
      const res = await fetch(
        `https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}${filePath}`,
        { method: "DELETE", headers: { AccessKey: BUNNY_STORAGE_API_KEY } }
      );
      if (res.ok) {
        console.log(`Deleted: ${filePath}`);
        deleted++;
      } else {
        console.warn(`Failed (${res.status}): ${url}`);
        failed++;
      }
    } catch (err) {
      console.error(`Error deleting ${url}:`, err);
      failed++;
    }
  }

  console.log(`\nDone. Deleted: ${deleted}, Failed: ${failed}`);
}

cleanupMessageMedia();