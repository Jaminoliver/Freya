"use client";

import React, { createContext, useContext, useRef, useState, useCallback } from "react";

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
        // ── Step 1: Ask server to create the Bunny video object ───────────
        // No file is sent here — Vercel only sees a tiny JSON body.
        const initRes  = await fetch("/api/upload/video", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ title }),
        });
        const initData = await initRes.json();
        if (!initRes.ok) throw new Error(initData.error || "Failed to initialise upload");

        const { videoId, libraryId, apiKey } = initData as {
          videoId:   string;
          libraryId: string;
          apiKey:    string;
        };

        // ── Step 2: Upload directly from browser → Bunny (no Vercel proxy) ──
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`);
          xhr.setRequestHeader("AccessKey", apiKey);
          xhr.setRequestHeader("Content-Type", file.type || "video/mp4");

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              // 0–80%: raw browser → Bunny upload progress
              const pct = Math.round((e.loaded / e.total) * 80);
              updateUpload(uploadId, { progress: pct });
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Bunny upload failed: ${xhr.status}`));
            }
          };
          xhr.onerror = () => reject(new Error("Network error during upload"));
          xhr.send(file); // send raw File — no FormData overhead
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

        // Notify caller so they can create the post immediately
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