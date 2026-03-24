/**
 * scripts/fix-welcome-media-urls.ts
 *
 * One-time script to re-sign expired BunnyCDN URLs in message_media rows
 * that were inserted by the welcome message sender.
 *
 * Run with:
 *   npx tsx scripts/fix-welcome-media-urls.ts
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createServiceSupabaseClient } from "../lib/supabase/server";
import { signBunnyUrl } from "../lib/utils/bunny";

function refreshBunnyUrl(storedUrl: string | null): string | null {
  if (!storedUrl) return null;
  try {
    const url  = new URL(storedUrl);
    const path = url.pathname;
    return signBunnyUrl(path);
  } catch {
    return storedUrl;
  }
}

async function main() {
  const supabase = createServiceSupabaseClient();

  console.log("[Fix Welcome Media] ── START ──────────────────────────────────");

  // Step 1: Get all welcome message IDs
  const { data: welcomeMessages, error: wmError } = await supabase
    .from("welcome_messages")
    .select("id");

  if (wmError || !welcomeMessages?.length) {
    console.log("[Fix Welcome Media] No welcome messages found — exiting");
    return;
  }

  const welcomeMessageIds = welcomeMessages.map((m: any) => m.id);
  console.log(`[Fix Welcome Media] Found ${welcomeMessageIds.length} welcome message(s)`);

  // Step 2: Get all message IDs sent by welcome message sender
  // These are identified by matching media URLs stored in welcome_message_media
  const { data: welcomeMediaRows, error: wmmError } = await supabase
    .from("welcome_message_media")
    .select("media_url")
    .in("welcome_message_id", welcomeMessageIds);

  if (wmmError || !welcomeMediaRows?.length) {
    console.log("[Fix Welcome Media] No welcome media rows found — exiting");
    return;
  }

  const welcomeUrls = new Set(welcomeMediaRows.map((r: any) => r.media_url).filter(Boolean));
  console.log(`[Fix Welcome Media] Found ${welcomeUrls.size} unique welcome media URL(s)`);

  // Step 3: Find message_media rows with those URLs
  const { data: messagMediaRows, error: mmError } = await supabase
    .from("message_media")
    .select("id, url")
    .in("url", Array.from(welcomeUrls));

  if (mmError) {
    console.error("[Fix Welcome Media] Error fetching message_media:", mmError);
    return;
  }

  if (!messagMediaRows?.length) {
    // Fallback: find by URL pattern containing expired token params
    console.log("[Fix Welcome Media] No exact URL matches — trying expired token pattern...");

    const { data: expiredRows, error: expError } = await supabase
      .from("message_media")
      .select("id, url")
      .like("url", "%token=%");

    if (expError || !expiredRows?.length) {
      console.log("[Fix Welcome Media] No expired URL rows found — nothing to fix");
      return;
    }

    await resignRows(supabase, expiredRows);
    return;
  }

  await resignRows(supabase, messagMediaRows);
}

async function resignRows(supabase: any, rows: { id: number; url: string }[]) {
  console.log(`[Fix Welcome Media] Re-signing ${rows.length} message_media row(s)...`);

  let fixed   = 0;
  let skipped = 0;
  let failed  = 0;

  for (const row of rows) {
    const freshUrl = refreshBunnyUrl(row.url);

    if (!freshUrl || freshUrl === row.url) {
      skipped++;
      continue;
    }

    const { error } = await supabase
      .from("message_media")
      .update({ url: freshUrl })
      .eq("id", row.id);

    if (error) {
      console.error(`[Fix Welcome Media] Failed to update row ${row.id}:`, error);
      failed++;
    } else {
      console.log(`[Fix Welcome Media] ✅ Fixed row ${row.id}`);
      fixed++;
    }
  }

  console.log(`[Fix Welcome Media] ── DONE — fixed: ${fixed} | skipped: ${skipped} | failed: ${failed} ──`);
}

main().catch((err) => {
  console.error("[Fix Welcome Media] Fatal error:", err);
  process.exit(1);
});