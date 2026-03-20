"use client";

import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from "react";
import * as tus from "tus-js-client";
import { compressPhotoIfNeeded } from "@/lib/utils/compressPhoto";

export interface UploadItem {
  id:       string;
  fileName: string;
  progress: number;
  phase:    "uploading" | "processing" | "done" | "error";
  mediaId?: number;
  error?:   string;
  file?:          File;
  files?:         File[];
  _title?:        string;
  _onMediaId?:    (mediaId: number) => void;
  _onMediaIds?:   (mediaIds: number[]) => void;
  _onDone?:       () => void;
  _onError?:      (err: string) => void;
  _thumbnailBlob?: Blob;
  _isPhoto?:      boolean;
  _isMultiPhoto?: boolean;
  _isText?:       boolean;
  _isPoll?:       boolean;
  _isMessage?:    boolean;
  _videoId?:      string;
  // Message upload specific
  _conversationId?: number;
  _isPPV?:          boolean;
  _ppvPrice?:       number;
  _content?:        string;
  _onMessageSent?:  (message: any) => void;
  _tempId?:         string;
}

interface PersistedUpload {
  id:          string;
  fileName:    string;
  progress:    number;
  phase:       UploadItem["phase"];
  mediaId?:    number;
  error?:      string;
  _isMessage?: boolean;
}

const SESSION_KEY = "freya_uploads";

function loadPersistedUploads(): PersistedUpload[] {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as PersistedUpload[]) : [];
  } catch {
    return [];
  }
}

function savePersistedUploads(uploads: UploadItem[]) {
  try {
    const serialisable: PersistedUpload[] = uploads.map(
      ({ id, fileName, progress, phase, mediaId, error, _isMessage }) => ({
        id, fileName, progress, phase, mediaId, error, _isMessage,
      })
    );
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(serialisable));
  } catch {}
}

interface UploadContextValue {
  uploads:             UploadItem[];
  startVideoUpload:    (params: {
    file:           File;
    title:          string;
    thumbnailBlob?: Blob;
    onMediaId:      (mediaId: number) => void;
    onError:        (err: string) => void;
  }) => string;
  startPhotoUpload:    (params: {
    file:      File;
    onMediaId: (mediaId: number) => void;
    onError:   (err: string) => void;
  }) => string;
  startMultiPhotoUpload: (params: {
    files:      File[];
    onMediaIds: (mediaIds: number[]) => void;
    onError:    (err: string) => void;
  }) => string;
  startTextPost: (params: {
    label:   string;
    onDone:  () => void;
    onError: (err: string) => void;
  }) => string;
  startPollPost: (params: {
    label:   string;
    onDone:  () => void;
    onError: (err: string) => void;
  }) => string;
  startMessageUpload: (params: {
    files:          File[];
    conversationId: number;
    content?:       string;
    isPPV?:         boolean;
    ppvPrice?:      number;
    tempId:         string;
    onProgress:     (progress: number) => void;
    onSent:         (message: any) => void;
    onError:        (err: string) => void;
  }) => string;
  dismissUpload: (id: string) => void;
  retryUpload:   (id: string) => void;
  clearDone:     () => void;
}

const UploadContext = createContext<UploadContextValue | null>(null);

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [uploads, setUploads] = useState<UploadItem[]>(() => {
    return loadPersistedUploads().map((u) => ({
      ...u,
      phase: u.phase === "uploading" || u.phase === "processing" ? "error" : u.phase,
      error: u.phase === "uploading" || u.phase === "processing" ? "Upload interrupted — please retry" : u.error,
    }));
  });

  const pollTimers     = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const progressCbs    = useRef<Record<string, (progress: number) => void>>({});
  const sentCbs        = useRef<Record<string, (message: any) => void>>({});
  const errorCbs       = useRef<Record<string, (err: string) => void>>({});

  useEffect(() => {
    savePersistedUploads(uploads);
  }, [uploads]);

  const didResumePoll = useRef(false);
  useEffect(() => {
    if (didResumePoll.current) return;
    didResumePoll.current = true;
    setUploads((prev) => {
      for (const u of prev) {
        if (u.phase === "processing" && u.mediaId && !pollTimers.current[u.id]) {
          startPolling(u.id, u.mediaId);
        }
      }
      return prev;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateUpload = useCallback((id: string, patch: Partial<UploadItem>) => {
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  }, []);

  const checkWatermark = useCallback(async (uploadId: string, videoId: string) => {
    try {
      const res  = await fetch(`/api/upload/video/watermark-check?videoId=${videoId}`);
      const data = await res.json();
      if (data.hasWatermark) {
        console.log(`✅ [watermark] videoId=${videoId} — watermark confirmed`);
      } else {
        console.warn(`⚠️ [watermark] videoId=${videoId} — NO watermark detected`);
      }
    } catch (err) {
      console.error(`[watermark] check failed for videoId=${videoId}:`, err);
    }
  }, []);

  const startPolling = useCallback((uploadId: string, mediaId: number, videoId?: string) => {
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

          const bunnyVideoId = videoId ?? data.bunnyVideoId;
          if (bunnyVideoId) checkWatermark(uploadId, bunnyVideoId);

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
      } catch {}
    }, 3000);
  }, [updateUpload, checkWatermark]);

  // ── Message upload ────────────────────────────────────────────────────────
  const runMessageUpload = useCallback(async (
    uploadId:       string,
    files:          File[],
    conversationId: number,
    content:        string | undefined,
    isPPV:          boolean,
    ppvPrice:       number | undefined,
    tempId:         string,
  ) => {
    const onProgress = progressCbs.current[uploadId];
    const onSent     = sentCbs.current[uploadId];
    const onError    = errorCbs.current[uploadId];

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      if (content?.trim()) formData.append("content", content.trim());
      if (isPPV && ppvPrice) formData.append("price", String(ppvPrice));

      const endpoint = isPPV
        ? `/api/conversations/${conversationId}/messages/ppv`
        : `/api/conversations/${conversationId}/messages/media`;

      const data = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 90);
            updateUpload(uploadId, { progress: pct });
            onProgress?.(pct);
          }
        };

        xhr.onload = () => {
          try {
            const json = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(json);
            } else {
              reject(new Error(json.error ?? `Upload failed (${xhr.status})`));
            }
          } catch {
            reject(new Error(`Upload failed (${xhr.status})`));
          }
        };

        xhr.onerror   = () => reject(new Error("Network error"));
        xhr.ontimeout = () => reject(new Error("Upload timed out"));
        xhr.timeout   = 120000;

        xhr.open("POST", endpoint);
        xhr.send(formData);
      });

      updateUpload(uploadId, { progress: 100, phase: "done" });
      onProgress?.(100);
      onSent?.({ ...data.message, tempId });

    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      updateUpload(uploadId, { phase: "error", error: msg });
      onError?.(msg);
    } finally {
      delete progressCbs.current[uploadId];
      delete sentCbs.current[uploadId];
      delete errorCbs.current[uploadId];
    }
  }, [updateUpload]);

  const startMessageUpload = useCallback(({
    files, conversationId, content, isPPV = false, ppvPrice, tempId,
    onProgress, onSent, onError,
  }: {
    files:          File[];
    conversationId: number;
    content?:       string;
    isPPV?:         boolean;
    ppvPrice?:      number;
    tempId:         string;
    onProgress:     (progress: number) => void;
    onSent:         (message: any) => void;
    onError:        (err: string) => void;
  }): string => {
    const uploadId = `msg_${Date.now()}_${Math.random()}`;
    const label    = `${files.length} file${files.length > 1 ? "s" : ""}`;

    progressCbs.current[uploadId] = onProgress;
    sentCbs.current[uploadId]     = onSent;
    errorCbs.current[uploadId]    = onError;

    setUploads((prev) => [...prev, {
      id: uploadId, fileName: label, progress: 0, phase: "uploading",
      files, _isMessage: true, _conversationId: conversationId,
      _isPPV: isPPV, _ppvPrice: ppvPrice, _content: content, _tempId: tempId,
    }]);

    runMessageUpload(uploadId, files, conversationId, content, isPPV, ppvPrice, tempId);
    return uploadId;
  }, [runMessageUpload]);

  // ── Text post ─────────────────────────────────────────────────────────────
  const runTextPost = useCallback(async (
    uploadId: string, onDone: () => void, onError: (err: string) => void,
  ) => {
    try {
      updateUpload(uploadId, { progress: 50 });
      await new Promise((r) => setTimeout(r, 400));
      updateUpload(uploadId, { progress: 100, phase: "done" });
      onDone();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Post failed";
      updateUpload(uploadId, { phase: "error", error: msg });
      onError(msg);
    }
  }, [updateUpload]);

  const startTextPost = useCallback(({ label, onDone, onError }: {
    label: string; onDone: () => void; onError: (err: string) => void;
  }): string => {
    const uploadId = `upload_${Date.now()}_${Math.random()}`;
    setUploads((prev) => [...prev, {
      id: uploadId, fileName: label, progress: 0, phase: "uploading",
      _isText: true, _onDone: onDone, _onError: onError,
    }]);
    runTextPost(uploadId, onDone, onError);
    return uploadId;
  }, [runTextPost]);

  // ── Poll post ─────────────────────────────────────────────────────────────
  const runPollPost = useCallback(async (
    uploadId: string, onDone: () => void, onError: (err: string) => void,
  ) => {
    try {
      updateUpload(uploadId, { progress: 50 });
      await new Promise((r) => setTimeout(r, 400));
      updateUpload(uploadId, { progress: 100, phase: "done" });
      onDone();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Post failed";
      updateUpload(uploadId, { phase: "error", error: msg });
      onError(msg);
    }
  }, [updateUpload]);

  const startPollPost = useCallback(({ label, onDone, onError }: {
    label: string; onDone: () => void; onError: (err: string) => void;
  }): string => {
    const uploadId = `upload_${Date.now()}_${Math.random()}`;
    setUploads((prev) => [...prev, {
      id: uploadId, fileName: label, progress: 0, phase: "uploading",
      _isPoll: true, _onDone: onDone, _onError: onError,
    }]);
    runPollPost(uploadId, onDone, onError);
    return uploadId;
  }, [runPollPost]);

  // ── Single photo upload ───────────────────────────────────────────────────
  const runPhotoUpload = useCallback(async (
    uploadId: string, file: File,
    onMediaId: (mediaId: number) => void, onError: (err: string) => void,
  ) => {
    try {
      updateUpload(uploadId, { progress: 10 });
      const compressed = await compressPhotoIfNeeded(file);
      updateUpload(uploadId, { progress: 40 });
      const formData = new FormData();
      formData.append("file", compressed);
      updateUpload(uploadId, { progress: 60 });
      const res  = await fetch("/api/upload/photo", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Photo upload failed");
      const mediaId = data.results?.[0]?.mediaId;
      if (!mediaId) throw new Error("No media ID returned from upload");
      updateUpload(uploadId, { progress: 100, phase: "done", mediaId });
      onMediaId(mediaId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      updateUpload(uploadId, { phase: "error", error: msg });
      onError(msg);
    }
  }, [updateUpload]);

  const startPhotoUpload = useCallback(({ file, onMediaId, onError }: {
    file: File; onMediaId: (mediaId: number) => void; onError: (err: string) => void;
  }): string => {
    const uploadId = `upload_${Date.now()}_${Math.random()}`;
    setUploads((prev) => [...prev, {
      id: uploadId, fileName: file.name, progress: 0, phase: "uploading",
      file, _onMediaId: onMediaId, _onError: onError, _isPhoto: true,
    }]);
    runPhotoUpload(uploadId, file, onMediaId, onError);
    return uploadId;
  }, [runPhotoUpload]);

  // ── Multi photo upload ────────────────────────────────────────────────────
  const runMultiPhotoUpload = useCallback(async (
    uploadId: string, files: File[],
    onMediaIds: (mediaIds: number[]) => void, onError: (err: string) => void,
  ) => {
    try {
      updateUpload(uploadId, { progress: 10 });
      const compressed = await Promise.all(files.map((f) => compressPhotoIfNeeded(f)));
      updateUpload(uploadId, { progress: 40 });
      const formData = new FormData();
      for (const f of compressed) formData.append("file", f);
      updateUpload(uploadId, { progress: 60 });
      const res  = await fetch("/api/upload/photo", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Photo upload failed");
      const mediaIds: number[] = (data.results as { mediaId: number }[]).map((r) => r.mediaId);
      if (!mediaIds.length) throw new Error("No media IDs returned from upload");
      updateUpload(uploadId, { progress: 100, phase: "done" });
      onMediaIds(mediaIds);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      updateUpload(uploadId, { phase: "error", error: msg });
      onError(msg);
    }
  }, [updateUpload]);

  const startMultiPhotoUpload = useCallback(({ files, onMediaIds, onError }: {
    files: File[]; onMediaIds: (mediaIds: number[]) => void; onError: (err: string) => void;
  }): string => {
    const uploadId = `upload_${Date.now()}_${Math.random()}`;
    setUploads((prev) => [...prev, {
      id: uploadId, fileName: `${files.length} photos`, progress: 0, phase: "uploading",
      files, _onMediaIds: onMediaIds, _onError: onError, _isMultiPhoto: true,
    }]);
    runMultiPhotoUpload(uploadId, files, onMediaIds, onError);
    return uploadId;
  }, [runMultiPhotoUpload]);

  // ── Video upload ──────────────────────────────────────────────────────────
  const runUpload = useCallback(async (
    uploadId: string, file: File, title: string, thumbnailBlob: Blob | undefined,
    onMediaId: (mediaId: number) => void, onError: (err: string) => void,
  ) => {
    try {
      let customThumbnailUrl: string | null = null;
      if (thumbnailBlob) {
        try {
          const formData = new FormData();
          formData.append("file", thumbnailBlob, "thumbnail.jpg");
          const res  = await fetch("/api/upload/thumbnail", { method: "POST", body: formData });
          const data = await res.json();
          if (res.ok) customThumbnailUrl = data.url;
        } catch {}
      }

      const initRes  = await fetch("/api/upload/video", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, customThumbnailUrl }),
      });
      const initData = await initRes.json();
      if (!initRes.ok) throw new Error(initData.error || "Failed to initialise upload");

      const { videoId, tusEndpoint, expireTime, signature, libraryId } = initData as {
        videoId: string; tusEndpoint: string; expireTime: number; signature: string; libraryId: string;
      };

      updateUpload(uploadId, { _videoId: videoId });

      await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(file, {
          endpoint: tusEndpoint, chunkSize: 5 * 1024 * 1024,
          retryDelays: [0, 3000, 5000, 10000, 20000],
          storeFingerprintForResuming: false,
          headers: { AuthorizationSignature: signature, AuthorizationExpire: String(expireTime), VideoId: videoId, LibraryId: libraryId },
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
        upload.start();
      });

      updateUpload(uploadId, { progress: 82, phase: "processing" });

      const completeRes  = await fetch("/api/upload/video/complete", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, mimeType: file.type, fileSizeBytes: file.size, customThumbnailUrl }),
      });
      const completeData = await completeRes.json();
      if (!completeRes.ok) throw new Error(completeData.error || "Failed to save record");

      const mediaId: number = completeData.mediaId;
      updateUpload(uploadId, { mediaId, progress: 85, phase: "processing" });
      onMediaId(mediaId);
      startPolling(uploadId, mediaId, videoId);

    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      updateUpload(uploadId, { phase: "error", error: msg });
      onError(msg);
    }
  }, [updateUpload, startPolling]);

  const startVideoUpload = useCallback(({ file, title, thumbnailBlob, onMediaId, onError }: {
    file: File; title: string; thumbnailBlob?: Blob;
    onMediaId: (mediaId: number) => void; onError: (err: string) => void;
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
      if (item?._isMessage && item.files && item._conversationId && item._tempId) {
        runMessageUpload(id, item.files, item._conversationId, item._content, item._isPPV ?? false, item._ppvPrice, item._tempId);
      } else if (item?._isText && item._onDone && item._onError) {
        runTextPost(id, item._onDone, item._onError);
      } else if (item?._isPoll && item._onDone && item._onError) {
        runPollPost(id, item._onDone, item._onError);
      } else if (item?._isMultiPhoto && item.files && item._onMediaIds && item._onError) {
        runMultiPhotoUpload(id, item.files, item._onMediaIds, item._onError);
      } else if (item?._isPhoto && item.file && item._onMediaId && item._onError) {
        runPhotoUpload(id, item.file, item._onMediaId, item._onError);
      } else if (item?.file && item._title && item._onMediaId && item._onError) {
        runUpload(id, item.file, item._title, item._thumbnailBlob, item._onMediaId, item._onError);
      }
      return prev;
    });
  }, [runUpload, runPhotoUpload, runMultiPhotoUpload, runTextPost, runPollPost, runMessageUpload]);

  const clearDone = useCallback(() => {
    setUploads((prev) => prev.filter((u) => u.phase !== "done"));
  }, []);

  return (
    <UploadContext.Provider value={{
      uploads, startVideoUpload, startPhotoUpload, startMultiPhotoUpload,
      startTextPost, startPollPost, startMessageUpload, dismissUpload, retryUpload, clearDone,
    }}>
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const ctx = useContext(UploadContext);
  if (!ctx) throw new Error("useUpload must be used inside UploadProvider");
  return ctx;
}