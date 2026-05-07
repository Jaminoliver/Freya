// lib/utils/thumbnailFromFile.ts
//
// Generate a small JPEG data URL thumbnail from any File (image or video).
// Data URLs are plain strings — survive page navigation/unmount, unlike
// blob URLs from URL.createObjectURL which are revoked when their owning
// document goes away.

const TARGET_MAX_EDGE = 240;
const JPEG_QUALITY    = 0.7;
const VIDEO_TIMEOUT_MS = 6000;

export async function fileToThumbnailDataURL(file: File): Promise<string | null> {
  if (file.type.startsWith("video/")) return videoToThumbnailDataURL(file);
  if (file.type.startsWith("image/")) return imageToThumbnailDataURL(file);
  return null;
}

function imageToThumbnailDataURL(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const { w, h } = scaleToFit(img.width, img.height, TARGET_MAX_EDGE);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(null); return; }
        try {
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

function videoToThumbnailDataURL(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const url   = URL.createObjectURL(file);
    const video = document.createElement("video");
    let resolved = false;

    const finish = (result: string | null) => {
      if (resolved) return;
      resolved = true;
      try { URL.revokeObjectURL(url); } catch {}
      resolve(result);
    };

    video.preload     = "metadata";
    video.muted       = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";

    video.onloadedmetadata = () => {
      // Seek to 0.5s or middle, whichever is smaller
      const target = Math.min(0.5, (video.duration || 1) / 2);
      try { video.currentTime = target; } catch { finish(null); }
    };
    video.onseeked = () => {
      const vw = video.videoWidth, vh = video.videoHeight;
      if (!vw || !vh) { finish(null); return; }
      const { w, h } = scaleToFit(vw, vh, TARGET_MAX_EDGE);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { finish(null); return; }
      try {
        ctx.drawImage(video, 0, 0, w, h);
        finish(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
      } catch {
        finish(null);
      }
    };
    video.onerror = () => finish(null);

    video.src = url;
    setTimeout(() => finish(null), VIDEO_TIMEOUT_MS);
  });
}

function scaleToFit(w: number, h: number, max: number): { w: number; h: number } {
  if (w <= max && h <= max) return { w, h };
  const ratio = w / h;
  if (ratio >= 1) return { w: max, h: Math.round(max / ratio) };
  return { w: Math.round(max * ratio), h: max };
}