import crypto from "crypto";
import dns from "dns";

// Force Node.js to use Google DNS — bypasses broken OS/ISP DNS resolution
dns.setServers(["8.8.8.8", "1.1.1.1"]);

// ─── Config — read lazily at call time so dotenv always runs first ─────────────

function env() {
  return {
    STORAGE_ZONE:    process.env.BUNNY_STORAGE_ZONE!,
    STORAGE_API_KEY: process.env.BUNNY_STORAGE_API_KEY!,
    CDN_URL:         process.env.BUNNY_CDN_URL!,
    CDN_TOKEN_KEY:   process.env.BUNNY_CDN_TOKEN_KEY!,
    STREAM_LIBRARY:  process.env.BUNNY_STREAM_LIBRARY_ID!,
    STREAM_API_KEY:  process.env.BUNNY_STREAM_API_KEY!,
    STREAM_CDN_HOST: process.env.BUNNY_STREAM_CDN_HOSTNAME ?? "vz-8bc100f4-3c0.b-cdn.net",
    BUNNY_API_KEY:   process.env.BUNNY_API_KEY!,
    STORAGE_BASE_URL: `https://storage.bunnycdn.com/${process.env.BUNNY_STORAGE_ZONE}`,
    STREAM_BASE_URL:  `https://video.bunnycdn.com/library/${process.env.BUNNY_STREAM_LIBRARY_ID}`,
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UploadPhotoResult {
  url: string;
  path: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Signed URL Generator ─────────────────────────────────────────────────────

export function signBunnyUrl(path: string, expiresInSeconds = 86400): string {
  const { CDN_URL, CDN_TOKEN_KEY } = env();
  const expires   = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const hashInput = CDN_TOKEN_KEY + path + expires;
  const token     = crypto
    .createHash("sha256")
    .update(hashInput)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  return `${CDN_URL}${path}?token=${token}&expires=${expires}`;
}

// ─── TUS Signature Generator ──────────────────────────────────────────────────

export function getBunnyTusCredentials(videoId: string): {
  tusEndpoint:  string;
  expireTime:   number;
  signature:    string;
  libraryId:    string;
} {
  const { STREAM_LIBRARY, STREAM_API_KEY } = env();
  const expireTime = Math.floor(Date.now() / 1000) + 3600;
  const signature  = crypto
    .createHash("sha256")
    .update(STREAM_LIBRARY + STREAM_API_KEY + expireTime + videoId)
    .digest("hex");

  return {
    tusEndpoint: "https://video.bunnycdn.com/tusupload",
    expireTime,
    signature,
    libraryId:   STREAM_LIBRARY,
  };
}

// ─── Photo / GIF Upload ───────────────────────────────────────────────────────

export async function uploadPhotoToBunny(
  buffer: Buffer,
  userId: string,
  filename: string,
  mimeType: string
): Promise<UploadPhotoResult> {
  const { STORAGE_BASE_URL, STORAGE_API_KEY } = env();
  const ext      = filename.split(".").pop() ?? "jpg";
  const safeName = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const path     = `/posts/${userId}/${safeName}`;

  const res = await fetch(`${STORAGE_BASE_URL}${path}`, {
    method:  "PUT",
    headers: {
      AccessKey:      STORAGE_API_KEY,
      "Content-Type": mimeType,
    },
    body: new Uint8Array(buffer),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bunny Storage upload failed: ${res.status} — ${text}`);
  }

  return { url: signBunnyUrl(path), path };
}

// ─── Video: Create (with retry) ───────────────────────────────────────────────

export async function createBunnyVideo(title: string): Promise<string> {
  const { STREAM_BASE_URL, STREAM_API_KEY } = env();
  const MAX_RETRIES = 3;
  const DELAYS      = [500, 1500, 3000];

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(`${STREAM_BASE_URL}/videos`, {
        method:  "POST",
        headers: {
          AccessKey:      STREAM_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title }),
      });

      if (res.status === 503 || res.status === 502 || res.status === 429) {
        const text = await res.text();
        lastError  = new Error(`Bunny Stream create video failed: ${res.status} — ${text}`);
        if (attempt < MAX_RETRIES - 1) {
          await sleep(DELAYS[attempt]);
          continue;
        }
        throw lastError;
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Bunny Stream create video failed: ${res.status} — ${text}`);
      }

      const data = await res.json();
      return data.guid as string;

    } catch (err) {
      if (err instanceof Error && err.message.includes("Bunny Stream create video failed")) {
        throw err;
      }
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES - 1) {
        await sleep(DELAYS[attempt]);
      }
    }
  }

  throw lastError ?? new Error("createBunnyVideo failed after retries");
}

// ─── Watermark: Upload PNG to library ────────────────────────────────────────
// Uploads a PNG buffer as the library watermark image.
// Must be called BEFORE enableBunnyWatermark.

export async function uploadBunnyWatermark(pngBuffer: Buffer): Promise<void> {
  const { STREAM_LIBRARY, BUNNY_API_KEY } = env();

  const res = await fetch(`https://api.bunny.net/videolibrary/${STREAM_LIBRARY}/watermark`, {
    method:  "PUT",
    headers: {
      AccessKey:      BUNNY_API_KEY,
      "Content-Type": "image/png",
    },
    body: new Uint8Array(pngBuffer),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bunny watermark upload failed: ${res.status} — ${text}`);
  }
}

// ─── Watermark: Enable on library ────────────────────────────────────────────
// Sets watermark position and size using correct Bunny API field names.
// WatermarkPositionLeft/Top are % from top-left corner.
// Bottom-right at 3% padding = Left: 85, Top: 85 (for a 12% wide watermark)

export async function enableBunnyWatermark(options?: {
  positionLeft?:    number; // % from left, default 85 (bottom-right)
  positionTop?:     number; // % from top, default 85 (bottom-right)
  watermarkWidth?:  number; // % of video width, default 12
  watermarkHeight?: number; // % of video height, default 0 (auto)
}): Promise<void> {
  const { STREAM_LIBRARY, BUNNY_API_KEY } = env();
  const {
    positionLeft    = 85,
    positionTop     = 85,
    watermarkWidth  = 12,
    watermarkHeight = 0,
  } = options ?? {};

  const res = await fetch(`https://api.bunny.net/videolibrary/${STREAM_LIBRARY}`, {
    method:  "POST",
    headers: {
      AccessKey:      BUNNY_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      WatermarkPositionLeft: positionLeft,
      WatermarkPositionTop:  positionTop,
      WatermarkWidth:        watermarkWidth,
      WatermarkHeight:       watermarkHeight,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bunny watermark enable failed: ${res.status} — ${text}`);
  }
}

/**
 * @deprecated Use getBunnyTusCredentials instead — TUS is resumable and more reliable.
 */
export function getBunnyUploadUrl(videoId: string): {
  uploadUrl: string;
  headers: Record<string, string>;
} {
  const { STREAM_LIBRARY, STREAM_API_KEY } = env();
  return {
    uploadUrl: `https://video.bunnycdn.com/library/${STREAM_LIBRARY}/videos/${videoId}`,
    headers: {
      AccessKey:      STREAM_API_KEY,
      "Content-Type": "video/*",
    },
  };
}

export async function uploadVideoToBunny(
  buffer: Buffer,
  videoId: string
): Promise<void> {
  const { STREAM_BASE_URL, STREAM_API_KEY } = env();
  const res = await fetch(`${STREAM_BASE_URL}/videos/${videoId}`, {
    method:  "PUT",
    headers: {
      AccessKey:      STREAM_API_KEY,
      "Content-Type": "video/*",
    },
    body: new Uint8Array(buffer),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bunny Stream upload failed: ${res.status} — ${text}`);
  }
}

export function getBunnyStreamUrls(videoId: string): {
  hlsUrl: string;
  thumbnailUrl: string;
} {
  const { STREAM_LIBRARY, STREAM_CDN_HOST } = env();
  return {
    hlsUrl:       `https://iframe.mediadelivery.net/play/${STREAM_LIBRARY}/${videoId}/playlist.m3u8`,
    thumbnailUrl: `https://${STREAM_CDN_HOST}/${videoId}/thumbnail.jpg`,
  };
}

export function getBunnyRawVideoUrl(videoId: string): string {
  const { STREAM_CDN_HOST } = env();
  return `https://${STREAM_CDN_HOST}/${videoId}/original`;
}

export async function deleteBunnyPhoto(path: string): Promise<void> {
  const { STORAGE_BASE_URL, STORAGE_API_KEY } = env();
  await fetch(`${STORAGE_BASE_URL}${path}`, {
    method:  "DELETE",
    headers: { AccessKey: STORAGE_API_KEY },
  });
}

export async function deleteBunnyVideo(videoId: string): Promise<void> {
  const { STREAM_BASE_URL, STREAM_API_KEY } = env();
  await fetch(`${STREAM_BASE_URL}/videos/${videoId}`, {
    method:  "DELETE",
    headers: { AccessKey: STREAM_API_KEY },
  });
}