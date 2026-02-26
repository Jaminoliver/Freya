"use client";

import React, { createContext, useContext, useRef, useState, useCallback } from "react";
import * as tus from "tus-js-client";

export interface UploadItem {
  id:       string;
  fileName: string;
  progress: number;
  phase:    "uploading" | "processing" | "done" | "error";
  mediaId?: number;
  error?:   string;
  file?:       File;
  _title?:     string;
  _onMediaId?: (mediaId: number) => void;
  _onError?:   (err: string) => void;
  _thumbnailBlob?: Blob;
}

interface UploadContextValue {
  uploads:          UploadItem[];
  startVideoUpload: (params: {
    file:           File;
    title:          string;
    thumbnailBlob?: Blob;
    onMediaId:      (mediaId: number) => void;
    onError:        (err: string) => void;
  }) => string;
  dismissUpload: (id: string) => void;
  retryUpload:   (id: string) => void;
  clearDone:     () => void;
}

const UploadContext = createContext<UploadContextValue | null>(null);

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const pollTimers = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  const updateUpload = useCallback((id: string, patch: Partial<UploadItem>) => {
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  }, []);

  const startPolling = useCallback((uploadId: string, mediaId: number) => {
    let attempts = 0;
    const MAX_ATTEMPTS = 60;

    pollTimers.current[uploadId] = setInterval(async () => {
      attempts++;
      try {
        const res  = await fetch(`/api/media/${mediaId}/status`);
        const data = await res.json();

        if (data.status === "completed") {
          clearInterval(pollTimers.current[uploadId]);
          delete pollTimers.current[uploadId];
          updateUpload(uploadId, { progress: 100, phase: "done" });
        } else if (data.status === "failed") {
          clearInterval(pollTimers.current[uploadId]);
          delete pollTimers.current[uploadId];
          updateUpload(uploadId, { phase: "error", error: "Processing failed" });
        } else {
          setUploads((prev) =>
            prev.map((u) => u.id !== uploadId ? u : { ...u, progress: Math.min(95, u.progress + 2) })
          );
        }

        if (attempts >= MAX_ATTEMPTS) {
          clearInterval(pollTimers.current[uploadId]);
          delete pollTimers.current[uploadId];
          updateUpload(uploadId, { phase: "error", error: "Processing timed out" });
        }
      } catch { /* ignore network blips */ }
    }, 3000);
  }, [updateUpload]);

  const runUpload = useCallback(async (
    uploadId:      string,
    file:          File,
    title:         string,
    thumbnailBlob: Blob | undefined,
    onMediaId:     (mediaId: number) => void,
    onError:       (err: string) => void,
  ) => {
    try {
      // ── Step 1: Upload creator-picked thumbnail (if any) ──────────
      let customThumbnailUrl: string | null = null;
      if (thumbnailBlob) {
        try {
          const formData = new FormData();
          formData.append("file", thumbnailBlob, "thumbnail.jpg");
          const res  = await fetch("/api/upload/thumbnail", { method: "POST", body: formData });
          const data = await res.json();
          if (res.ok) customThumbnailUrl = data.url;
        } catch {
          // non-fatal — fall back to Bunny auto-generated thumbnail
        }
      }

      // ── Step 2: Get presigned TUS credentials ─────────────────────
      const initRes  = await fetch("/api/upload/video", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ title, customThumbnailUrl }),
      });
      const initData = await initRes.json();
      if (!initRes.ok) throw new Error(initData.error || "Failed to initialise upload");

      const { videoId, tusEndpoint, expireTime, signature, libraryId } = initData as {
        videoId:     string;
        tusEndpoint: string;
        expireTime:  number;
        signature:   string;
        libraryId:   string;
      };

      // ── Step 3: TUS direct browser → Bunny ───────────────────────
      await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(file, {
          endpoint:    tusEndpoint,
          chunkSize:   5 * 1024 * 1024,
          retryDelays: null, // fail fast on auth errors
          headers: {
            AuthorizationSignature: signature,
            AuthorizationExpire:    String(expireTime),
            VideoId:                videoId,
            LibraryId:              libraryId,
          },
          metadata: { filetype: file.type, title },
          onProgress(bytesUploaded, bytesTotal) {
            updateUpload(uploadId, { progress: Math.round((bytesUploaded / bytesTotal) * 80) });
          },
          onSuccess() {
            fetch("/api/upload/video/log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: "tus_success", videoId, fileSize: file.size }) }).catch(() => {});
            resolve();
          },
          onError(err) {
            const responseBody = (err as any).originalResponse?.getBody?.() ?? "no body";
            fetch("/api/upload/video/log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: "tus_error", videoId, message: err.message, responseBody }) }).catch(() => {});
            reject(new Error(`Upload failed: ${err.message} — ${responseBody}`));
          },
        });

        upload.findPreviousUploads().then((prev) => {
          if (prev.length) upload.resumeFromPreviousUpload(prev[0]);
          upload.start();
        });
      });

      updateUpload(uploadId, { progress: 82, phase: "processing" });

      // ── Step 4: Save to Supabase ──────────────────────────────────
      const completeRes  = await fetch("/api/upload/video/complete", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ videoId, mimeType: file.type, fileSizeBytes: file.size, customThumbnailUrl }),
      });
      const completeData = await completeRes.json();
      if (!completeRes.ok) throw new Error(completeData.error || "Failed to save record");

      const mediaId: number = completeData.mediaId;
      updateUpload(uploadId, { mediaId, progress: 85, phase: "processing" });
      onMediaId(mediaId);
      startPolling(uploadId, mediaId);

    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      updateUpload(uploadId, { phase: "error", error: msg });
      onError(msg);
    }
  }, [updateUpload, startPolling]);

  const startVideoUpload = useCallback(({
    file, title, thumbnailBlob, onMediaId, onError,
  }: {
    file:           File;
    title:          string;
    thumbnailBlob?: Blob;
    onMediaId:      (mediaId: number) => void;
    onError:        (err: string) => void;
  }): string => {
    const uploadId = `upload_${Date.now()}_${Math.random()}`;

    setUploads((prev) => [...prev, {
      id: uploadId, fileName: file.name, progress: 0, phase: "uploading",
      file, _title: title, _onMediaId: onMediaId, _onError: onError, _thumbnailBlob: thumbnailBlob,
    }]);

    runUpload(uploadId, file, title, thumbnailBlob, onMediaId, onError);
    return uploadId;
  }, [runUpload]);

  const dismissUpload = useCallback((id: string) => {
    if (pollTimers.current[id]) { clearInterval(pollTimers.current[id]); delete pollTimers.current[id]; }
    setUploads((prev) => prev.filter((u) => u.id !== id));
  }, []);

  const retryUpload = useCallback((id: string) => {
    setUploads((prev) => prev.map((u) => u.id === id ? { ...u, progress: 0, phase: "uploading", error: undefined } : u));
    setUploads((prev) => {
      const item = prev.find((u) => u.id === id);
      if (item?.file && item._title && item._onMediaId && item._onError) {
        runUpload(id, item.file, item._title, item._thumbnailBlob, item._onMediaId, item._onError);
      }
      return prev;
    });
  }, [runUpload]);

  const clearDone = useCallback(() => {
    setUploads((prev) => prev.filter((u) => u.phase !== "done"));
  }, []);

  return (
    <UploadContext.Provider value={{ uploads, startVideoUpload, dismissUpload, retryUpload, clearDone }}>
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const ctx = useContext(UploadContext);
  if (!ctx) throw new Error("useUpload must be used inside UploadProvider");
  return ctx;
}