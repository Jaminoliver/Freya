import sharp from "sharp";

// ─── Freya Watermark Generator ────────────────────────────────────────────────
// White text with dark drop shadow — visible on any background color.
// ─────────────────────────────────────────────────────────────────────────────

export async function generateFreyaWatermarkPng(): Promise<Buffer> {
  const svg = `
    <svg width="220" height="56" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow">
          <feDropShadow dx="2" dy="2" stdDeviation="2" flood-color="black" flood-opacity="0.8"/>
        </filter>
      </defs>
      <text
        x="10"
        y="44"
        font-family="Arial Black, Arial, sans-serif"
        font-size="40"
        font-weight="900"
        fill="white"
        fill-opacity="0.9"
        letter-spacing="6"
        filter="url(#shadow)"
      >FREYA</text>
    </svg>
  `;

  return await sharp(Buffer.from(svg))
    .png()
    .toBuffer();
}