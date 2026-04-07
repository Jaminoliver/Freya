"use client";

import React, {
  createContext, useContext, useRef, useState, useCallback,
} from "react";
import * as tus from "tus-js-client";
import { compressVideoIfNeeded } from "@/lib/utils/compressVideo";

// ── Types ─────────────────────────────────────────────────────────────────────

export type StoryUploadPhase =
  | "idle"
  | "compressing"
  | "uploading"
  | "processing"
  | "done";

// Defined here so StoryUploadModal imports from context, not the other way around
export interface UploadJob {
  file:      File;
  caption:   string;
  mediaType: "photo" | "video";
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
  clearError:             () => void;
  // Called by StoryBar when polling/realtime confirms processing is done
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

// ── Provider ──────────────────────────────────────────────────────────────────

export function StoryUploadProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StoryUploadState>(INITIAL);

  const cancelledRef       = useRef(false);
  const isCancellingRef    = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const tusInstanceRef     = useRef<tus.Upload | null>(null);

  const patch = useCallback((partial: Partial<StoryUploadState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  const reset = useCallback(() => setState(INITIAL), []);

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

    reset();
    isCancellingRef.current = false;
  }, [reset]);

  // ── Mark processing complete (called by StoryBar after polling confirms) ───

  const markProcessingComplete = useCallback(() => {
    patch({ phase: "done", uploadPct: 100 });
    setTimeout(() => reset(), 2000);
  }, [patch, reset]);

  // ── Clear error ────────────────────────────────────────────────────────────

  const clearError = useCallback(() => patch({ error: null }), [patch]);

  // ── Start upload ───────────────────────────────────────────────────────────

  const startUpload = useCallback(async (job: UploadJob) => {
    cancelledRef.current = false;
    reset();

    try {
      let fileToUpload = job.file;

      // ── Compress video if needed ──────────────────────────────────────────
      if (job.mediaType === "video") {
        patch({ phase: "compressing" });
        fileToUpload = await compressVideoIfNeeded(job.file, (p) => {
          patch({ compressPct: p.percent });
        });
        if (cancelledRef.current) return;
      }

      patch({ phase: "uploading", uploadPct: 0 });

      // ── Photo upload ──────────────────────────────────────────────────────
      if (job.mediaType === "photo") {
        const formData = new FormData();
        formData.append("file",      fileToUpload);
        formData.append("mediaType", "photo");
        if (job.caption) formData.append("caption", job.caption);

        patch({ uploadPct: 30 });

        const controller = new AbortController();
        abortControllerRef.current = controller;
        const timer = setTimeout(() => controller.abort(), 120_000);

        let res: Response;
        try {
          res = await fetch("/api/stories/init", {
            method: "POST",
            body:   formData,
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timer);
          abortControllerRef.current = null;
        }

        if (cancelledRef.current) return;
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Upload failed");

        patch({ phase: "done", uploadPct: 100 });
        setTimeout(() => reset(), 2000);
        return;
      }

      // ── Video upload — init ───────────────────────────────────────────────
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const timer = setTimeout(() => controller.abort(), 30_000);

      let initRes: Response;
      try {
        initRes = await fetch("/api/stories/init", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            mediaType: "video",
            caption:   job.caption,
            clipStart: job.clipStart,
            clipEnd:   job.clipEnd,
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

      // ── Video upload — TUS ────────────────────────────────────────────────
      await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(fileToUpload, {
          endpoint:    tusEndpoint,
          chunkSize:   10 * 1024 * 1024, // 10 MB chunks
          retryDelays: [0, 3000, 5000, 10000, 20000],
          storeFingerprintForResuming: false,
          headers: {
            AuthorizationSignature: signature,
            AuthorizationExpire:    String(expireTime),
            VideoId:                videoId,
            LibraryId:              libraryId,
          },
          metadata: { filetype: fileToUpload.type, title: `story-${videoId}` },
          onProgress(bytesUploaded, bytesTotal) {
            if (cancelledRef.current) return;
            const pct = Math.round((bytesUploaded / bytesTotal) * 75) + 20;
            patch({ uploadPct: pct });
          },
          onSuccess() { resolve(); },
          onError(err) {
            if (cancelledRef.current) { resolve(); return; }
            reject(new Error(`Upload failed: ${err.message}`));
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
      const msg = err?.name === "AbortError"
        ? "Upload timed out — please try again"
        : (err.message ?? "Upload failed");
      patch({ phase: "idle", error: msg });
    }
  }, [patch, reset]);

  return (
    <StoryUploadContext.Provider value={{
      ...state,
      startUpload,
      cancelUpload,
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