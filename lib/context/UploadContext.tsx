"use client";

import React, { createContext, useContext, useRef, useState, useCallback } from "react";
import * as tus from "tus-js-client";

export interface UploadItem {
  id:       string;
  fileName: string;
  progress: number;   // 0–100
  phase:    "uploading" | "processing" | "done" | "error";
  mediaId?: number;
  error?:   string;
}

interface UploadContextValue {
  uploads:          UploadItem[];
  startVideoUpload: (params: {
    file:      File;
    title:     string;
    onMediaId: (mediaId: number) => void;
    onError:   (err: string) => void;
  }) => string;
  clearDone: () => void;
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
    const MAX_ATTEMPTS = 60; // 3 mins

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
            prev.map((u) => {
              if (u.id !== uploadId) return u;
              return { ...u, progress: Math.min(95, u.progress + 2) };
            })
          );
        }

        if (attempts >= MAX_ATTEMPTS) {
          clearInterval(pollTimers.current[uploadId]);
          delete pollTimers.current[uploadId];
          updateUpload(uploadId, { phase: "error", error: "Processing timed out" });
        }
      } catch {
        // ignore network blips
      }
    }, 3000);
  }, [updateUpload]);

  const startVideoUpload = useCallback(({
    file, title, onMediaId, onError,
  }: {
    file:      File;
    title:     string;
    onMediaId: (mediaId: number) => void;
    onError:   (err: string) => void;
  }): string => {
    const uploadId = `upload_${Date.now()}_${Math.random()}`;

    setUploads((prev) => [
      ...prev,
      { id: uploadId, fileName: file.name, progress: 0, phase: "uploading" },
    ]);

    (async () => {
      try {
        // ── Step 1: Get presigned TUS credentials from server ─────────────
        const initRes  = await fetch("/api/upload/video", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ title }),
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

        // ── Step 2: Upload directly browser → Bunny via TUS ──────────────
        // TUS is resumable — survives network drops, works on mobile
        await new Promise<void>((resolve, reject) => {
          const upload = new tus.Upload(file, {
            endpoint:    tusEndpoint,
            chunkSize:   5 * 1024 * 1024, // 5MB chunks — required for large files
            retryDelays: [0, 3000, 5000, 10000, 20000],
            headers: {
              AuthorizationSignature: signature,
              AuthorizationExpire:    String(expireTime),
              VideoId:                videoId,
              LibraryId:              libraryId,
            },
            metadata: {
              filetype: file.type,
              title,
            },
            onProgress(bytesUploaded, bytesTotal) {
              const pct = Math.round((bytesUploaded / bytesTotal) * 80);
              console.log(`[TUS] ${bytesUploaded}/${bytesTotal} (${pct}%)`);
              updateUpload(uploadId, { progress: pct });
            },
            onSuccess() {
              fetch("/api/upload/video/log", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ event: "tus_success", videoId, fileSize: file.size }),
              }).catch(() => {});
              resolve();
            },
            onError(err) {
              const responseBody = (err as any).originalResponse?.getBody?.() ?? "no body";
              fetch("/api/upload/video/log", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ event: "tus_error", videoId, message: err.message, responseBody }),
              }).catch(() => {});
              reject(new Error(`TUS upload failed: ${err.message}`));
            },
          });

          // Resume interrupted uploads automatically
          upload.findPreviousUploads().then((prev) => {
            if (prev.length) upload.resumeFromPreviousUpload(prev[0]);
            upload.start();
          });
        });

        updateUpload(uploadId, { progress: 82, phase: "processing" });

        // ── Step 3: Save record to Supabase ──────────────────────────────
        const completeRes  = await fetch("/api/upload/video/complete", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ videoId, mimeType: file.type, fileSizeBytes: file.size }),
        });
        const completeData = await completeRes.json();
        if (!completeRes.ok) throw new Error(completeData.error || "Failed to save record");

        const mediaId: number = completeData.mediaId;
        updateUpload(uploadId, { mediaId, progress: 85, phase: "processing" });

        onMediaId(mediaId);

        // ── Step 4: Poll for Bunny processing ─────────────────────────────
        startPolling(uploadId, mediaId);

      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        updateUpload(uploadId, { phase: "error", error: msg });
        onError(msg);
      }
    })();

    return uploadId;
  }, [updateUpload, startPolling]);

  const clearDone = useCallback(() => {
    setUploads((prev) => prev.filter((u) => u.phase !== "done"));
  }, []);

  return (
    <UploadContext.Provider value={{ uploads, startVideoUpload, clearDone }}>
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const ctx = useContext(UploadContext);
  if (!ctx) throw new Error("useUpload must be used inside UploadProvider");
  return ctx;
}