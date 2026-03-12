import crypto from "crypto";
function env() {
  return {
    STORAGE_ZONE:    process.env.BUNNY_STORAGE_ZONE!,
    STORAGE_API_KEY: process.env.BUNNY_STORAGE_API_KEY!,
    CDN_URL:         process.env.BUNNY_CDN_URL!,
    CDN_TOKEN_KEY:   process.env.BUNNY_CDN_TOKEN_KEY!,
    BUNNY_API_KEY:   process.env.BUNNY_API_KEY!,

    // ─── Posts library (watermarked) ───────────────────────────────────────
    STREAM_LIBRARY:  process.env.BUNNY_STREAM_LIBRARY_ID!,
    STREAM_API_KEY:  process.env.BUNNY_STREAM_API_KEY!,
    STREAM_CDN_HOST: process.env.BUNNY_STREAM_CDN_HOSTNAME ?? "vz-8bc100f4-3c0.b-cdn.net",

    // ─── Stories library (no watermark, high quality) ──────────────────────
    STORY_LIBRARY:   process.env.BUNNY_STORY_LIBRARY_ID   ?? "613387",
    STORY_API_KEY:   process.env.BUNNY_STORY_API_KEY      ?? "3d8f6da3-7c69-43a5-a65fdc781d40-75a8-4f0b",
    STORY_CDN_HOST:  process.env.BUNNY_STORY_CDN_HOSTNAME ?? "vz-7e0f0c7a-29e.b-cdn.net",

    // ─── Story CDN Token Key (Pull Zone → Security → Token Auth Key) ───────
    STORY_CDN_TOKEN_KEY: process.env.BUNNY_STORY_CDN_TOKEN_KEY ?? "",

    STORAGE_BASE_URL: `https://storage.bunnycdn.com/${process.env.BUNNY_STORAGE_ZONE}`,
    STREAM_BASE_URL:  `https://video.bunnycdn.com/library/${process.env.BUNNY_STREAM_LIBRARY_ID}`,
  };
}

export interface UploadPhotoResult {
  url: string;
  path: string;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

// ─── signBunnyUrl — single file (photos, avatars) ────────────────────────────
export function signBunnyUrl(path: string, expiresInSeconds = 86400): string {
  const { CDN_URL, CDN_TOKEN_KEY } = env();
  const expires   = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const hashInput = CDN_TOKEN_KEY + path + expires;
  const token     = crypto.createHash("sha256").update(hashInput).digest("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  return `${CDN_URL}${path}?token=${token}&expires=${expires}`;
}

// ─── signBunnyHlsUrl — HLS directory token (story videos) ────────────────────
export function signBunnyHlsUrl(videoId: string, expiresInSeconds = 21600): string {
  const { STORY_CDN_HOST, STORY_CDN_TOKEN_KEY } = env();

  if (!STORY_CDN_TOKEN_KEY) {
    return `https://${STORY_CDN_HOST}/${videoId}/playlist.m3u8`;
  }

  const expires       = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const signaturePath = `/${videoId}/`;
  const parameterData = `token_path=${signaturePath}`;
  const hashableBase  = STORY_CDN_TOKEN_KEY + signaturePath + expires + parameterData;

  const token = crypto
    .createHash("sha256")
    .update(hashableBase)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  return `https://${STORY_CDN_HOST}/${videoId}/playlist.m3u8?token=${token}&expires=${expires}&token_path=${encodeURIComponent(signaturePath)}`;
}

// ─── signBunnyStoryThumbnail ──────────────────────────────────────────────────
export function signBunnyStoryThumbnail(videoId: string, expiresInSeconds = 86400): string {
  const { STORY_CDN_HOST, STORY_CDN_TOKEN_KEY } = env();

  if (!STORY_CDN_TOKEN_KEY) {
    return `https://${STORY_CDN_HOST}/${videoId}/thumbnail.jpg`;
  }

  const path         = `/${videoId}/thumbnail.jpg`;
  const expires      = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const hashableBase = STORY_CDN_TOKEN_KEY + path + expires;
  const token = crypto
    .createHash("sha256")
    .update(hashableBase)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  return `https://${STORY_CDN_HOST}${path}?token=${token}&expires=${expires}`;
}

// ─── TUS Credentials — Posts library ─────────────────────────────────────────
export function getBunnyTusCredentials(videoId: string): {
  tusEndpoint: string; expireTime: number; signature: string; libraryId: string;
} {
  const { STREAM_LIBRARY, STREAM_API_KEY } = env();
  const expireTime = Math.floor(Date.now() / 1000) + 3600;
  const signature  = crypto.createHash("sha256")
    .update(STREAM_LIBRARY + STREAM_API_KEY + expireTime + videoId).digest("hex");
  return { tusEndpoint: "https://video.bunnycdn.com/tusupload", expireTime, signature, libraryId: STREAM_LIBRARY };
}

// ─── TUS Credentials — Stories library ───────────────────────────────────────
export function getBunnyStoryTusCredentials(videoId: string): {
  tusEndpoint: string; expireTime: number; signature: string; libraryId: string;
} {
  const { STORY_LIBRARY, STORY_API_KEY } = env();
  const expireTime = Math.floor(Date.now() / 1000) + 3600;
  const signature  = crypto.createHash("sha256")
    .update(STORY_LIBRARY + STORY_API_KEY + expireTime + videoId).digest("hex");
  return { tusEndpoint: "https://video.bunnycdn.com/tusupload", expireTime, signature, libraryId: STORY_LIBRARY };
}

// ─── Photo Upload ─────────────────────────────────────────────────────────────
export async function uploadPhotoToBunny(
  buffer: Buffer, userId: string, filename: string, mimeType: string
): Promise<UploadPhotoResult> {
  const { STORAGE_BASE_URL, STORAGE_API_KEY } = env();
  const ext      = filename.split(".").pop() ?? "jpg";
  const safeName = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const path     = `/posts/${userId}/${safeName}`;

  const res = await fetchWithTimeout(`${STORAGE_BASE_URL}${path}`, {
    method: "PUT",
    headers: { AccessKey: STORAGE_API_KEY, "Content-Type": mimeType },
    body: new Uint8Array(buffer),
  }, 15000);

  if (!res.ok) throw new Error(`Bunny Storage upload failed: ${res.status} — ${await res.text()}`);
  return { url: signBunnyUrl(path), path };
}

// ─── Posts Video (watermarked library) ───────────────────────────────────────
export async function createBunnyVideo(title: string): Promise<string> {
  const { STREAM_BASE_URL, STREAM_API_KEY } = env();
  const MAX_RETRIES = 3;
  const DELAYS      = [500, 1500, 3000];
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetchWithTimeout(`${STREAM_BASE_URL}/videos`, {
        method: "POST",
        headers: { AccessKey: STREAM_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      }, 8000);

      if ([502, 503, 429].includes(res.status)) {
        lastError = new Error(`Bunny Stream create video failed: ${res.status}`);
        if (attempt < MAX_RETRIES - 1) { await sleep(DELAYS[attempt]); continue; }
        throw lastError;
      }
      if (!res.ok) throw new Error(`Bunny Stream create video failed: ${res.status} — ${await res.text()}`);
      return (await res.json()).guid as string;

    } catch (err: any) {
      if (err?.name === "AbortError") {
        lastError = new Error(`Bunny Stream create video timed out (attempt ${attempt + 1})`);
      } else if (err instanceof Error && err.message.includes("Bunny Stream create video failed")) {
        throw err;
      } else {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
      if (attempt < MAX_RETRIES - 1) await sleep(DELAYS[attempt]);
    }
  }
  throw lastError ?? new Error("createBunnyVideo failed after retries");
}

export async function uploadVideoToBunny(buffer: Buffer, videoId: string): Promise<void> {
  const { STREAM_BASE_URL, STREAM_API_KEY } = env();
  const res = await fetchWithTimeout(`${STREAM_BASE_URL}/videos/${videoId}`, {
    method: "PUT",
    headers: { AccessKey: STREAM_API_KEY, "Content-Type": "video/*" },
    body: new Uint8Array(buffer),
  }, 60000);
  if (!res.ok) throw new Error(`Bunny Stream upload failed: ${res.status} — ${await res.text()}`);
}

export function getBunnyStreamUrls(videoId: string): { hlsUrl: string; thumbnailUrl: string } {
  const { STREAM_CDN_HOST } = env();
  return {
    hlsUrl:       `https://${STREAM_CDN_HOST}/${videoId}/playlist.m3u8`,
    thumbnailUrl: `https://${STREAM_CDN_HOST}/${videoId}/thumbnail.jpg`,
  };
}

// ─── Stories Video (no watermark) ────────────────────────────────────────────
export async function createBunnyStoryVideo(title: string): Promise<string> {
  const { STORY_LIBRARY, STORY_API_KEY } = env();
  const MAX_RETRIES = 3;
  const DELAYS      = [500, 1500, 3000];
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetchWithTimeout(
        `https://video.bunnycdn.com/library/${STORY_LIBRARY}/videos`,
        {
          method: "POST",
          headers: { AccessKey: STORY_API_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        }, 8000);

      if ([502, 503, 429].includes(res.status)) {
        lastError = new Error(`Bunny Story create video failed: ${res.status}`);
        if (attempt < MAX_RETRIES - 1) { await sleep(DELAYS[attempt]); continue; }
        throw lastError;
      }
      if (!res.ok) throw new Error(`Bunny Story create video failed: ${res.status} — ${await res.text()}`);
      return (await res.json()).guid as string;

    } catch (err: any) {
      if (err?.name === "AbortError") {
        lastError = new Error(`Bunny Story create video timed out (attempt ${attempt + 1})`);
      } else if (err instanceof Error && err.message.includes("Bunny Story create video failed")) {
        throw err;
      } else {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
      if (attempt < MAX_RETRIES - 1) await sleep(DELAYS[attempt]);
    }
  }
  throw lastError ?? new Error("createBunnyStoryVideo failed after retries");
}

export async function uploadBunnyStoryVideo(buffer: Buffer, videoId: string): Promise<void> {
  const { STORY_LIBRARY, STORY_API_KEY } = env();
  const res = await fetchWithTimeout(
    `https://video.bunnycdn.com/library/${STORY_LIBRARY}/videos/${videoId}`,
    {
      method: "PUT",
      headers: { AccessKey: STORY_API_KEY, "Content-Type": "video/*" },
      body: new Uint8Array(buffer),
    }, 60000);
  if (!res.ok) throw new Error(`Bunny Story upload failed: ${res.status} — ${await res.text()}`);
}

export function getBunnyStoryStreamUrls(videoId: string): { hlsUrl: string; thumbnailUrl: string } {
  return {
    hlsUrl:       signBunnyHlsUrl(videoId),
    thumbnailUrl: signBunnyStoryThumbnail(videoId),
  };
}

export async function deleteBunnyStoryVideo(videoId: string): Promise<void> {
  const { STORY_LIBRARY, STORY_API_KEY } = env();
  await fetchWithTimeout(
    `https://video.bunnycdn.com/library/${STORY_LIBRARY}/videos/${videoId}`,
    { method: "DELETE", headers: { AccessKey: STORY_API_KEY } }, 8000);
}

// ─── Watermark (posts library only) ──────────────────────────────────────────
export async function uploadBunnyWatermark(pngBuffer: Buffer): Promise<void> {
  const { STREAM_LIBRARY, BUNNY_API_KEY } = env();
  const res = await fetchWithTimeout(`https://api.bunny.net/videolibrary/${STREAM_LIBRARY}/watermark`, {
    method: "PUT",
    headers: { AccessKey: BUNNY_API_KEY, "Content-Type": "image/png" },
    body: new Uint8Array(pngBuffer),
  }, 10000);
  if (!res.ok) throw new Error(`Bunny watermark upload failed: ${res.status} — ${await res.text()}`);
}

export async function enableBunnyWatermark(options?: {
  positionLeft?: number; positionTop?: number; watermarkWidth?: number; watermarkHeight?: number;
}): Promise<void> {
  const { STREAM_LIBRARY, BUNNY_API_KEY } = env();
  const { positionLeft = 85, positionTop = 85, watermarkWidth = 12, watermarkHeight = 0 } = options ?? {};
  const res = await fetchWithTimeout(`https://api.bunny.net/videolibrary/${STREAM_LIBRARY}`, {
    method: "POST",
    headers: { AccessKey: BUNNY_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ WatermarkPositionLeft: positionLeft, WatermarkPositionTop: positionTop, WatermarkWidth: watermarkWidth, WatermarkHeight: watermarkHeight }),
  }, 10000);
  if (!res.ok) throw new Error(`Bunny watermark enable failed: ${res.status} — ${await res.text()}`);
}

// ─── Delete ───────────────────────────────────────────────────────────────────
export async function deleteBunnyPhoto(path: string): Promise<void> {
  const { STORAGE_BASE_URL, STORAGE_API_KEY } = env();
  await fetchWithTimeout(`${STORAGE_BASE_URL}${path}`, { method: "DELETE", headers: { AccessKey: STORAGE_API_KEY } }, 8000);
}

export async function deleteBunnyVideo(videoId: string): Promise<void> {
  const { STREAM_BASE_URL, STREAM_API_KEY } = env();
  await fetchWithTimeout(`${STREAM_BASE_URL}/videos/${videoId}`, { method: "DELETE", headers: { AccessKey: STREAM_API_KEY } }, 8000);
}

/** @deprecated Use getBunnyTusCredentials instead */
export function getBunnyUploadUrl(videoId: string): { uploadUrl: string; headers: Record<string, string> } {
  const { STREAM_LIBRARY, STREAM_API_KEY } = env();
  return {
    uploadUrl: `https://video.bunnycdn.com/library/${STREAM_LIBRARY}/videos/${videoId}`,
    headers: { AccessKey: STREAM_API_KEY, "Content-Type": "video/*" },
  };
}

export function getBunnyRawVideoUrl(videoId: string): string {
  const { STREAM_CDN_HOST } = env();
  return `https://${STREAM_CDN_HOST}/${videoId}/original`;
}