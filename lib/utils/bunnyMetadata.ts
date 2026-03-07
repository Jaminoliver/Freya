// app/lib/utils/bunnyMetadata.ts

export interface BunnyVideoMetadata {
  width:        number | null;
  height:       number | null;
  aspect_ratio: number | null;
  fps:          number | null;
  bitrate:      number | null;
  duration:     number | null;
}

export function extractBunnyMetadata(video: Record<string, unknown>): BunnyVideoMetadata {
  const width    = typeof video.width     === "number" && video.width     > 0 ? video.width     : null;
  const height   = typeof video.height    === "number" && video.height    > 0 ? video.height    : null;
  const fps      = typeof video.framerate === "number" && video.framerate > 0 ? video.framerate : null;
  const duration = typeof video.length    === "number" && video.length    > 0 ? video.length    : null;

  // storageSize is in bytes — convert to kbps using duration
  let bitrate: number | null = null;
  if (
    typeof video.storageSize === "number" &&
    video.storageSize > 0 &&
    duration !== null &&
    duration > 0
  ) {
    bitrate = Math.round((video.storageSize * 8) / duration / 1000);
  }

  let aspect_ratio: number | null = null;
  if (width !== null && height !== null && height > 0) {
    const raw = width / height;
    aspect_ratio = Math.min(Math.max(raw, 0.5), 2.0);
  }

  return { width, height, aspect_ratio, fps, bitrate, duration };
}