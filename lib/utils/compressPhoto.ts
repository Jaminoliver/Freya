/**
 * compressPhoto.ts
 * Browser-side photo compression using canvas.
 * Reduces file size before upload to avoid Vercel body size limits on mobile.
 * GIFs are returned as-is — canvas kills animation.
 */

const MAX_DIMENSION = 2048;
const JPEG_QUALITY  = 0.82;
const TARGET_BYTES  = 4 * 1024 * 1024; // 4MB — well under Vercel's limit

export async function compressPhotoIfNeeded(file: File): Promise<File> {
  // Never compress GIFs — canvas strips animation
  if (file.type === "image/gif") return file;

  // Already small enough — skip
  if (file.size <= TARGET_BYTES) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;

    // Calculate scaled dimensions
    let targetW = width;
    let targetH = height;

    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
      targetW     = Math.round(width  * ratio);
      targetH     = Math.round(height * ratio);
    }

    const canvas = new OffscreenCanvas(targetW, targetH);
    const ctx    = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    bitmap.close();

    const blob = await canvas.convertToBlob({
      type:    "image/jpeg",
      quality: JPEG_QUALITY,
    });

    // If compression made it larger somehow, return original
    if (blob.size >= file.size) return file;

    return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
      type: "image/jpeg",
    });

  } catch {
    // Canvas failed (e.g. HEIC on some browsers) — return original
    return file;
  }
}