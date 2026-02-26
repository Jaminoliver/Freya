import crypto from "crypto";

// ─── Config ───────────────────────────────────────────────────────────────────

const STORAGE_ZONE    = process.env.BUNNY_STORAGE_ZONE!;
const STORAGE_API_KEY = process.env.BUNNY_STORAGE_API_KEY!;
const CDN_URL         = process.env.BUNNY_CDN_URL!;
const CDN_TOKEN_KEY   = process.env.BUNNY_CDN_TOKEN_KEY!;
const STREAM_LIBRARY  = process.env.BUNNY_STREAM_LIBRARY_ID!;
const STREAM_API_KEY  = process.env.BUNNY_STREAM_API_KEY!;

const STORAGE_BASE_URL = `https://storage.bunnycdn.com/${STORAGE_ZONE}`;
const STREAM_BASE_URL  = `https://video.bunnycdn.com/library/${STREAM_LIBRARY}`;

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
  const MAX_RETRIES = 3;
  const DELAYS      = [500, 1500, 3000]; // ms between retries

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

      // Retry on 503 / 502 / 429 (server blips & rate limits)
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
      // Only retry on network errors, not on explicit non-retryable HTTP errors
      if (err instanceof Error && err.message.includes("Bunny Stream create video failed")) {
        throw err; // non-retryable HTTP error — bubble up immediately
      }
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES - 1) {
        await sleep(DELAYS[attempt]);
      }
    }
  }

  throw lastError ?? new Error("createBunnyVideo failed after retries");
}

/**
 * @deprecated Use getBunnyTusCredentials instead — TUS is resumable and more reliable.
 */
export function getBunnyUploadUrl(videoId: string): {
  uploadUrl: string;
  headers: Record<string, string>;
} {
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
  return {
    hlsUrl:       `https://iframe.mediadelivery.net/play/${STREAM_LIBRARY}/${videoId}/playlist.m3u8`,
    thumbnailUrl: `https://vz-${STREAM_LIBRARY}.b-cdn.net/${videoId}/thumbnail.jpg`,
  };
}

export function getBunnyRawVideoUrl(videoId: string): string {
  return `https://vz-${STREAM_LIBRARY}.b-cdn.net/${videoId}/original`;
}

export async function deleteBunnyPhoto(path: string): Promise<void> {
  await fetch(`${STORAGE_BASE_URL}${path}`, {
    method:  "DELETE",
    headers: { AccessKey: STORAGE_API_KEY },
  });
}

export async function deleteBunnyVideo(videoId: string): Promise<void> {
  await fetch(`${STREAM_BASE_URL}/videos/${videoId}`, {
    method:  "DELETE",
    headers: { AccessKey: STREAM_API_KEY },
  });
}