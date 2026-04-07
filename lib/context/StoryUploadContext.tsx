"use client";

import React, {
  createContext, useContext, useRef, useState, useCallback, useEffect,
} from "react";
import * as tus from "tus-js-client";
import { compressVideoIfNeeded } from "@/lib/utils/compressVideo";

// ── Types ─────────────────────────────────────────────────────────────────────

export type StoryUploadPhase =
  | "idle"
  | "compressing"
  | "uploading"
  | "processing"
  | "done"
  | "paused"   // network lost mid-upload
  | "error";

export interface UploadJob {
  files:     File[];
  caption:   string;
  mediaType: "photo" | "video" | "mixed";
  clipStart: number;
  clipEnd:   number;
}

interface StoryUploadState {
  phase:       StoryUploadPhase;
  uploadPct:   number;
  compressPct: number;
  error:       string | null;
  storyId:     number | null;
}

interface StoryUploadContextValue extends StoryUploadState {
  startUpload:            (job: UploadJob) => Promise<void>;
  cancelUpload:           () => void;
  retryUpload:            () => void;
  clearError:             () => void;
  markProcessingComplete: () => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const StoryUploadContext = createContext<StoryUploadContextValue | null>(null);

const INITIAL: StoryUploadState = {
  phase:       "idle",
  uploadPct:   0,
  compressPct: 0,
  error:       null,
  storyId:     null,
};

// ── Error classification ──────────────────────────────────────────────────────

function classifyError(err: unknown): string {
  if (!(err instanceof Error)) return "Upload failed";
  if (err.name === "AbortError") return "Upload timed out — please try again";
  const msg = err.message.toLowerCase();
  if (msg.includes("abort") || msg.includes("cancel")) return "Upload cancelled";
  if (
    msg.includes("network") || msg.includes("failed to fetch") ||
    msg.includes("net::") || msg.includes("xmlhttprequest") ||
    msg.includes("progressevent") || msg.includes("tus: failed to create")
  ) return "Network error — check your connection and retry";
  if (msg.includes("timeout") || msg.includes("timed out")) return "Upload timed out — please retry";
  if (msg.includes("413")) return "File is too large for the server";
  if (msg.includes("429")) return "Too many uploads — please wait a moment";
  if (msg.includes("500") || msg.includes("502") || msg.includes("503")) return "Server error — please retry";
  return err.message || "Upload failed";
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function StoryUploadProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StoryUploadState>(INITIAL);

  const cancelledRef       = useRef(false);
  const isCancellingRef    = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const tusInstanceRef     = useRef<tus.Upload | null>(null);
  const pendingJobRef      = useRef<UploadJob | null>(null); // stored for retry

  const patch = useCallback((partial: Partial<StoryUploadState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  const reset = useCallback(() => setState(INITIAL), []);

  // ── Network online/offline detection ───────────────────────────────────────

  useEffect(() => {
    const goOffline = () => {
      setState((prev) =>
        prev.phase === "uploading" || prev.phase === "compressing"
          ? { ...prev, phase: "paused", error: "Connection lost — will resume when online…" }
          : prev
      );
    };
    const goOnline = () => {
      setState((prev) =>
        prev.phase === "paused"
          ? { ...prev, phase: "uploading", error: null }
          : prev
      );
      // TUS handles resume internally via retryDelays
    };
    window.addEventListener("offline", goOffline);
    window.addEventListener("online",  goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online",  goOnline);
    };
  }, []);

  // ── Cancel ─────────────────────────────────────────────────────────────────

  const cancelUpload = useCallback(async () => {
    if (isCancellingRef.current) return;
    isCancellingRef.current = true;
    cancelledRef.current    = true;

    abortControllerRef.current?.abort();
    abortControllerRef.current = null;

    if (tusInstanceRef.current) {
      try { await tusInstanceRef.current.abort(true); } catch {}
      tusInstanceRef.current = null;
    }

    pendingJobRef.current   = null;
    isCancellingRef.current = false;
    reset();
  }, [reset]);

  // ── Core upload logic ──────────────────────────────────────────────────────

  const runUpload = useCallback(async (job: UploadJob) => {
    cancelledRef.current = false;
    pendingJobRef.current = job;

    const photos    = job.files.filter((f) => f.type.startsWith("image/"));
    const videoFile = job.files.find((f) => f.type.startsWith("video/"));

    try {
      // ── Step 1: compress video if present ─────────────────────────────────
      let compressedVideo: File | undefined;
      if (videoFile) {
        patch({ phase: "compressing", compressPct: 0 });
        compressedVideo = await compressVideoIfNeeded(videoFile, (p) => {
          patch({ compressPct: p.percent });
        });
        if (cancelledRef.current) return;
      }

      patch({ phase: "uploading", uploadPct: 0 });

      // ── Step 2: upload photos (if any) via multipart POST ─────────────────
      let photoStoryIds: number[] = [];
      if (photos.length > 0) {
        const fd = new FormData();
        for (const p of photos) fd.append("file", p);
        fd.append("mediaType", "photo");
        if (job.caption) fd.append("caption", job.caption);

        patch({ uploadPct: 10 });

        const photoData = await new Promise<any>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.upload.onprogress = (e) => {
            if (!e.lengthComputable || cancelledRef.current) return;
            // If no video, photos take 0-100%; with video they take 0-40%
            const scale = videoFile ? 0.4 : 1;
            patch({ uploadPct: Math.round((e.loaded / e.total) * 90 * scale) });
          };
          xhr.onload = () => {
            try {
              const json = JSON.parse(xhr.responseText);
              if (xhr.status >= 200 && xhr.status < 300) resolve(json);
              else reject(new Error(json.error ?? `Server error (${xhr.status})`));
            } catch { reject(new Error(`Server error (${xhr.status})`)); }
          };
          xhr.onerror   = () => reject(new Error("Network error — check your connection and retry"));
          xhr.ontimeout = () => reject(new Error("Upload timed out — please retry"));
          xhr.onabort   = () => reject(new Error("Upload cancelled"));
          xhr.timeout   = 120_000;
          xhr.open("POST", "/api/stories/init");
          xhr.send(fd);
        });

        if (cancelledRef.current) return;
        photoStoryIds = Array.isArray(photoData.storyIds)
          ? photoData.storyIds
          : photoData.storyId
          ? [photoData.storyId]
          : [];
      }

      // ── Step 3: if no video, we're done ───────────────────────────────────
      if (!compressedVideo) {
        patch({ phase: "done", uploadPct: 100 });
        setTimeout(() => reset(), 2000);
        return;
      }

      // ── Step 4: init video upload ─────────────────────────────────────────
      const photoOffset = photos.length > 0 ? 40 : 0;
      patch({ uploadPct: photoOffset });

      const controller = new AbortController();
      abortControllerRef.current = controller;
      const timer = setTimeout(() => controller.abort(), 30_000);

      let initRes: Response;
      try {
        initRes = await fetch("/api/stories/init", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            mediaType:    "video",
            caption:      job.caption,
            clipStart:    job.clipStart,
            clipEnd:      job.clipEnd,
            photoStoryIds,                   // link photos created in step 2
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
        abortControllerRef.current = null;
      }

      if (cancelledRef.current) return;

      const initData = await initRes.json();
      if (!initRes.ok) throw new Error(initData.error ?? "Upload failed");

      const { storyId, videoId, tusEndpoint, expireTime, signature, libraryId } = initData;

      // ── Step 5: TUS video upload ──────────────────────────────────────────
      await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(compressedVideo!, {
          endpoint:    tusEndpoint,
          chunkSize:   10 * 1024 * 1024,
          retryDelays: [0, 3000, 5000, 10000, 20000],
          storeFingerprintForResuming: false,
          headers: {
            AuthorizationSignature: signature,
            AuthorizationExpire:    String(expireTime),
            VideoId:                videoId,
            LibraryId:              libraryId,
          },
          metadata: { filetype: compressedVideo!.type, title: `story-${videoId}` },
          onProgress(bytesUploaded, bytesTotal) {
            if (cancelledRef.current) return;
            // Video portion: photoOffset% → 95%
            const videoPct  = Math.round((bytesUploaded / bytesTotal) * (95 - photoOffset));
            patch({ uploadPct: photoOffset + videoPct });
          },
          onSuccess() { resolve(); },
          onError(err) {
            if (cancelledRef.current) { resolve(); return; }
            const responseCode = (err as any).originalResponse?.getStatus?.() ?? "n/a";
            const isNetwork    = responseCode === "n/a" || String(responseCode) === "0";
            reject(new Error(
              isNetwork
                ? "Network error — check your connection and retry"
                : `Upload failed: ${err.message}`
            ));
          },
        });

        tusInstanceRef.current = upload;
        upload.start();
      });

      tusInstanceRef.current = null;
      if (cancelledRef.current) return;

      // Phase moves to processing — StoryBar polls and calls markProcessingComplete
      patch({ phase: "processing", storyId, uploadPct: 100 });

    } catch (err: any) {
      if (cancelledRef.current) return;
      const msg = classifyError(err);
      patch({ phase: "error", error: msg });
    }
  }, [patch, reset]);

  // ── Public start ───────────────────────────────────────────────────────────

  const startUpload = useCallback(async (job: UploadJob) => {
    reset();
    await runUpload(job);
  }, [reset, runUpload]);

  // ── Retry ──────────────────────────────────────────────────────────────────

  const retryUpload = useCallback(() => {
    const job = pendingJobRef.current;
    if (!job) return;
    patch({ phase: "uploading", uploadPct: 0, compressPct: 0, error: null });
    runUpload(job);
  }, [patch, runUpload]);

  // ── Mark processing complete (called by StoryBar after polling confirms) ───

  const markProcessingComplete = useCallback(() => {
    patch({ phase: "done", uploadPct: 100 });
    setTimeout(() => reset(), 2000);
  }, [patch, reset]);

  // ── Clear error ────────────────────────────────────────────────────────────

  const clearError = useCallback(() => patch({ error: null }), [patch]);

  return (
    <StoryUploadContext.Provider value={{
      ...state,
      startUpload,
      cancelUpload,
      retryUpload,
      clearError,
      markProcessingComplete,
    }}>
      {children}
    </StoryUploadContext.Provider>
  );
}

export function useStoryUpload() {
  const ctx = useContext(StoryUploadContext);
  if (!ctx) throw new Error("useStoryUpload must be used inside StoryUploadProvider");
  return ctx;
}