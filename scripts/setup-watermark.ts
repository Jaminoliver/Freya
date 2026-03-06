/**
 * One-time Bunny watermark setup
 * Run: npx tsx scripts/setup-watermark.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

if (!process.env.BUNNY_API_KEY) {
  console.error("❌ BUNNY_API_KEY is not set in .env.local");
  process.exit(1);
}

console.log("🔑 BUNNY_API_KEY loaded:", process.env.BUNNY_API_KEY.slice(0, 8) + "...");
console.log("📺 BUNNY_STREAM_LIBRARY_ID:", process.env.BUNNY_STREAM_LIBRARY_ID);

import { uploadBunnyWatermark, enableBunnyWatermark } from "../lib/utils/bunny";
import { generateFreyaWatermarkPng } from "../lib/utils/watermark";

const LIBRARY_ID = process.env.BUNNY_STREAM_LIBRARY_ID!;
const API_KEY    = process.env.BUNNY_API_KEY!;

async function getLibrarySettings() {
  const res  = await fetch(`https://api.bunny.net/videolibrary/${LIBRARY_ID}?includeAccessKey=false`, {
    headers: { AccessKey: API_KEY },
  });
  const data = await res.json();
  console.log("\n📋 Library settings from Bunny:");
  console.log("  WatermarkPositionLeft:", data.WatermarkPositionLeft);
  console.log("  WatermarkPositionTop: ", data.WatermarkPositionTop);
  console.log("  WatermarkWidth:       ", data.WatermarkWidth);
  console.log("  WatermarkHeight:      ", data.WatermarkHeight);
  console.log("  HasWatermark:         ", data.HasWatermark);
  console.log("  Full response:        ", JSON.stringify(data, null, 2));
}

async function main() {
  console.log("\n─── BEFORE ──────────────────────────────");
  await getLibrarySettings();

  console.log("\nStep 1/3 — Generating FREYA watermark PNG...");
  const pngBuffer = await generateFreyaWatermarkPng();
  console.log("✓ PNG generated, size:", pngBuffer.length, "bytes");

  console.log("\nStep 2/3 — Uploading watermark to Bunny library...");
  await uploadBunnyWatermark(pngBuffer);
  console.log("✓ Watermark uploaded");

  console.log("\nStep 3/3 — Enabling watermark on Bunny library...");
  await enableBunnyWatermark({
    positionLeft:   85,
    positionTop:    85,
    watermarkWidth: 12,
  });
  console.log("✓ Watermark settings sent");

  console.log("\n─── AFTER ───────────────────────────────");
  await getLibrarySettings();

  console.log("\n✅ Done.");
}

main().catch((err) => {
  console.error("❌ Setup failed:", err.message);
  process.exit(1);
});