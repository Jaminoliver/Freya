import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

let ffmpeg: FFmpeg | null = null;
let loadPromise: Promise<void> | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg?.loaded) return ffmpeg;
  if (loadPromise) { await loadPromise; return ffmpeg!; }

  ffmpeg = new FFmpeg();
  loadPromise = (async () => {
    await ffmpeg!.load({
      coreURL: await toBlobURL(
        "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js",
        "text/javascript",
      ),
      wasmURL: await toBlobURL(
        "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm",
        "application/wasm",
      ),
    });
  })();
  await loadPromise;
  return ffmpeg!;
}

export async function watermarkVideo(
  file: File,
  username: string,
  onProgress?: (pct: number) => void,
): Promise<File> {
  console.log("[watermark] loading ffmpeg...");
  let ff: FFmpeg;
  try {
    ff = await getFFmpeg();
    console.log("[watermark] ffmpeg loaded");
  } catch (err) {
    console.error("[watermark] load failed:", err);
    throw err;
  }

  ff.on("progress", ({ progress }) => {
    onProgress?.(Math.round(progress * 100));
  });

  // Load video
  ff.writeFile("input.mp4", await fetchFile(file));

  // Load logo
  const logoRes  = await fetch("/brand_transparent.png");
  const logoBlob = await logoRes.arrayBuffer();
  ff.writeFile("logo.png", new Uint8Array(logoBlob));

  const safeUsername = username.replace(/'/g, "\\'");

  // Composite: logo bottom-right only (drawtext not available in wasm build)
  console.log("[watermark] starting ffmpeg exec");
  const ret = await ff.exec([
    "-i", "input.mp4",
    "-i", "logo.png",
    "-filter_complex",
    "[1:v]scale=iw*0.12:-1[logo];[0:v][logo]overlay=W-w-16:H-h-16[out]",
    "-map", "[out]",
    "-map", "0:a?",
    "-c:v", "libx264",
    "-preset", "ultrafast",
    "-crf", "23",
    "-c:a", "copy",
    "-movflags", "+faststart",
    "output.mp4",
  ]);

  console.log("[watermark] exec return code:", ret);
  const data = await ff.readFile("output.mp4");

  // Cleanup
  ff.deleteFile("input.mp4");
  ff.deleteFile("logo.png");
  ff.deleteFile("output.mp4");
  ff.off("progress", () => {});

  const buffer = data instanceof Uint8Array ? data.buffer.slice(0) : data;
  return new File([buffer as ArrayBuffer], file.name, { type: "video/mp4" });
}