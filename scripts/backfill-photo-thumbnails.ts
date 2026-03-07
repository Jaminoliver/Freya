// scripts/backfill-photo-thumbnails.ts
// Run with: npx tsx scripts/backfill-photo-thumbnails.ts

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { encode } from "blurhash";
import crypto from "crypto";

const BATCH_SIZE = 10;

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const STORAGE_ZONE     = process.env.BUNNY_STORAGE_ZONE!;
const STORAGE_API_KEY  = process.env.BUNNY_STORAGE_API_KEY!;
const STORAGE_BASE_URL = `https://storage.bunnycdn.com/${STORAGE_ZONE}`;
const CDN_URL          = process.env.BUNNY_CDN_URL!;
const CDN_TOKEN_KEY    = process.env.BUNNY_CDN_TOKEN_KEY!;

function signBunnyUrl(path: string, expiresInSeconds = 86400): string {
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const token   = crypto
    .createHash("sha256")
    .update(CDN_TOKEN_KEY + path + expires)
    .digest("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  return `${CDN_URL}${path}?token=${token}&expires=${expires}`;
}

async function uploadToBunny(buffer: Buffer, userId: string): Promise<string> {
  const safeName = `${Date.now()}-${crypto.randomUUID()}.jpg`;
  const path     = `/posts/${userId}/${safeName}`;
  const res = await fetch(`${STORAGE_BASE_URL}${path}`, {
    method:  "PUT",
    headers: { AccessKey: STORAGE_API_KEY, "Content-Type": "image/jpeg" },
    body:    new Uint8Array(buffer),
  });
  if (!res.ok) throw new Error(`Bunny upload failed: ${res.status}`);
  return signBunnyUrl(path);
}

async function generateBlurHash(buffer: Buffer): Promise<string | null> {
  try {
    const { data, info } = await sharp(buffer)
      .resize(20, 20, { fit: "inside" }).ensureAlpha().raw()
      .toBuffer({ resolveWithObject: true });
    return encode(new Uint8ClampedArray(data), info.width, info.height, 4, 4);
  } catch { return null; }
}

async function generateThumbnail(buffer: Buffer): Promise<Buffer | null> {
  try {
    return await sharp(buffer)
      .resize(400, 400, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 70 }).toBuffer();
  } catch { return null; }
}

async function getDimensions(buffer: Buffer): Promise<{ width: number; height: number } | null> {
  try {
    const meta = await sharp(buffer).metadata();
    if (!meta.width || !meta.height) return null;
    return { width: meta.width, height: meta.height };
  } catch { return null; }
}

async function fetchBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch { return null; }
}

async function main() {
  // Fetch rows missing thumbnail_url OR width (covers both old and partial backfills)
  const { data: allRows, error } = await service
    .from("media")
    .select("id, creator_id, file_url, media_type, blur_hash, thumbnail_url, width, height")
    .in("media_type", ["photo", "gif"])
    .order("id", { ascending: true });

  if (error) { console.error("[Backfill] Fetch error:", error.message); process.exit(1); }

  const rows = (allRows ?? []).filter(r => !r.thumbnail_url || !r.width);

  console.log(`[Backfill] ${rows.length} rows to process\n`);

  let updated = 0, failed = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (row) => {
      try {
        const buffer = await fetchBuffer(row.file_url);
        if (!buffer) { console.warn(`⚠️  Could not fetch mediaId=${row.id}`); failed++; return; }

        const isGif = row.media_type === "gif";

        const [blurHash, thumbBuffer, dimensions] = await Promise.all([
          row.blur_hash ? Promise.resolve(row.blur_hash) : (isGif ? Promise.resolve(null) : generateBlurHash(buffer)),
          isGif || row.thumbnail_url ? Promise.resolve(null) : generateThumbnail(buffer),
          row.width ? Promise.resolve(null) : (isGif ? Promise.resolve(null) : getDimensions(buffer)),
        ]);

        let thumbnailUrl: string | null = row.thumbnail_url ?? null;
        if (thumbBuffer) {
          thumbnailUrl = await uploadToBunny(thumbBuffer, row.creator_id);
        }

        const { error: updateError } = await service
          .from("media")
          .update({
            thumbnail_url: thumbnailUrl,
            blur_hash:     blurHash ?? null,
            width:         dimensions?.width ?? row.width ?? null,
            height:        dimensions?.height ?? row.height ?? null,
            aspect_ratio:  dimensions ? dimensions.width / dimensions.height : (row.width && row.height ? row.width / row.height : null),
          })
          .eq("id", row.id);

        if (updateError) { console.error(`❌ mediaId=${row.id}:`, updateError.message); failed++; return; }

        console.log(`✅ mediaId=${row.id} — thumbnail=${thumbnailUrl ? "saved" : "null"} blur_hash=${blurHash ? "saved" : "null"} dimensions=${dimensions ? `${dimensions.width}x${dimensions.height}` : "skipped"}`);
        updated++;
      } catch (err) {
        console.error(`❌ mediaId=${row.id}:`, err);
        failed++;
      }
    }));
  }

  console.log(`\n[Backfill] Done — ✅ updated: ${updated}  ❌ failed: ${failed}  total: ${rows.length}`);
}

main();