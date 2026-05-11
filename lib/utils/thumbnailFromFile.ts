// lib/utils/thumbnailFromFile.ts
//
// Generate a small JPEG data URL thumbnail from any File (image or video).
// Data URLs are plain strings — survive page navigation/unmount, unlike
// blob URLs from URL.createObjectURL which are revoked when their owning
// document goes away.

const TARGET_MAX_EDGE = 640;
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
      try {
        video.currentTime = 0.1;
        if ('requestVideoFrameCallback' in video) {
          (video as any).requestVideoFrameCallback(captureFrame);
        } else {
          (video as HTMLVideoElement).onseeked = () => setTimeout(captureFrame, 200);
        }
      } catch { finish(null); }
    };
    const captureFrame = () => {
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

export function dataURLToBlob(dataURL: string): Blob {
  const [header, data] = dataURL.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
  const bytes = atob(data);
  const arr   = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

function scaleToFit(w: number, h: number, max: number): { w: number; h: number } {
  if (w <= max && h <= max) return { w, h };
  const ratio = w / h;
  if (ratio >= 1) return { w: max, h: Math.round(max / ratio) };
  return { w: Math.round(max * ratio), h: max };
}