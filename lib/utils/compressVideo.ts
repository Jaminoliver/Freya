"use client";

const COMPRESS_THRESHOLD_MB = 30; // compress anything over 30MB

let ffmpegInstance: import("@ffmpeg/ffmpeg").FFmpeg | null = null;
let ffmpegLoaded = false;

export interface CompressProgress {
  phase:   "loading" | "compressing" | "done";
  percent: number;
  message: string;
}

export async function compressVideoIfNeeded(
  file: File,
  onProgress?: (p: CompressProgress) => void,
  clipStart = 0,
  clipEnd = 0,
): Promise<File> {
  const fileMB    = file.size / (1024 * 1024);
  const needsTrim = clipEnd > 0 && (clipStart > 0 || clipEnd < (file.size / 1024 / 1024 * 60));

  console.log(`[compress] File: ${file.name} | Size: ${fileMB.toFixed(1)} MB`);

  if (fileMB <= COMPRESS_THRESHOLD_MB && !needsTrim) {
    console.log(`[compress] Skipping — file is under ${COMPRESS_THRESHOLD_MB}MB threshold and no trim needed`);
    onProgress?.({ phase: "done", percent: 100, message: "No compression needed" });
    return file;
  }

  console.log(`[compress] Starting compression (1080p, H.264, CRF 26)`);
  onProgress?.({ phase: "loading", percent: 0, message: "Loading compressor…" });

  const { FFmpeg }               = await import("@ffmpeg/ffmpeg");
  const { fetchFile, toBlobURL } = await import("@ffmpeg/util");

  if (!ffmpegInstance) {
    ffmpegInstance = new FFmpeg();
  }

  if (!ffmpegLoaded) {
    console.log("[compress] Loading FFmpeg WASM from CDN…");
    const baseURL = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd";
    await ffmpegInstance.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`,   "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    });
    ffmpegLoaded = true;
    console.log("[compress] FFmpeg WASM loaded ✓");
  }

  onProgress?.({ phase: "compressing", percent: 0, message: "Compressing video…" });

  ffmpegInstance.on("progress", ({ progress }) => {
    const pct = Math.round(Math.min(progress, 1) * 100);
    console.log(`[compress] ${pct}%`);
    onProgress?.({ phase: "compressing", percent: pct, message: `Compressing… ${pct}%` });
  });

  const inputName  = "input.mp4";
  const outputName = "output.mp4";

  console.log("[compress] Writing file to FFmpeg FS…");
  await ffmpegInstance.writeFile(inputName, await fetchFile(file));

  const trimFlags  = needsTrim ? ["-ss", String(clipStart), "-t", String(clipEnd - clipStart)] : [];
  const needsEncode = fileMB > COMPRESS_THRESHOLD_MB;

  console.log("[compress] Running FFmpeg…", { needsTrim, needsEncode, clipStart, clipEnd });
  await ffmpegInstance.exec([
    ...trimFlags,
    "-i",        inputName,
    ...(needsEncode ? [
      "-vf",       "scale='min(1920,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease:flags=lanczos",
      "-c:v",      "libx264",
      "-crf",      "26",
      "-preset",   "ultrafast",
      "-c:a",      "aac",
      "-b:a",      "128k",
      "-movflags", "+faststart",
    ] : [
      "-c",        "copy",
    ]),
    "-y",        outputName,
  ]);

  console.log("[compress] Reading compressed output…");
  const data = await ffmpegInstance.readFile(outputName);

  await ffmpegInstance.deleteFile(inputName);
  await ffmpegInstance.deleteFile(outputName);

  const buffer     = data as unknown as Uint8Array<ArrayBuffer>;
  const compressed = new File([buffer], file.name.replace(/\.[^.]+$/, ".mp4"), {
    type: "video/mp4",
  });

  const compressedMB = compressed.size / (1024 * 1024);
  const reductionPct = Math.round((1 - compressed.size / file.size) * 100);
  console.log(`[compress] Done ✓ | ${fileMB.toFixed(1)} MB → ${compressedMB.toFixed(1)} MB (${reductionPct}% smaller)`);

  onProgress?.({ phase: "done", percent: 100, message: `Compressed ${reductionPct}% smaller` });
  return compressed;
}