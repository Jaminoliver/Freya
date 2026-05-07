"use client";

import React, {
  createContext, useContext, useRef, useState, useCallback, useEffect,
} from "react";
import * as tus from "tus-js-client";
import { compressPhotoIfNeeded } from "@/lib/utils/compressPhoto";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UploadItem {
  id:        string;
  fileName:  string;
  progress:  number;
  phase:     "uploading" | "paused" | "processing" | "done" | "error";
  mediaId?:  number;
  error?:    string;
  speedBps?: number;   // bytes per second — for display
  eta?:      number;   // seconds remaining — for display
  // internal refs kept on the item for retry support
  file?:           File;
  files?:          File[];
  _title?:         string;
  _onMediaId?:     (mediaId: number) => void;
  _onMediaIds?:    (mediaIds: number[]) => void;
  _onDone?:        () => void;
  _onError?:       (err: string) => void;
  _thumbnailBlob?: Blob;
  _isPhoto?:       boolean;
  _isMultiPhoto?:  boolean;
  _isText?:        boolean;
  _isPoll?:        boolean;
  _isMessage?:     boolean;
  _videoId?:       string;
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

// ── Session persistence ───────────────────────────────────────────────────────

const SESSION_KEY = "freya_post_uploads";

function loadPersisted(): PersistedUpload[] {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as PersistedUpload[]) : [];
  } catch { return []; }
}

function savePersisted(uploads: UploadItem[]) {
  try {
    const data: PersistedUpload[] = uploads.map(
      ({ id, fileName, progress, phase, mediaId, error, _isMessage }) => ({
        id, fileName, progress, phase, mediaId, error, _isMessage,
      })
    );
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
  } catch {}
}

// ── Error classification ──────────────────────────────────────────────────────

function classifyError(err: unknown): string {
  if (!(err instanceof Error)) return "Upload failed";
  const msg = err.message.toLowerCase();
  if (msg.includes("abort") || msg.includes("cancel")) return "Upload cancelled";
  if (msg.includes("network") || msg.includes("failed to fetch") || msg.includes("net::") || msg.includes("xmlhttprequest") || msg.includes("progressevent") || msg.includes("tus: failed to create"))
  return "Network error — check your connection and retry";
  if (msg.includes("timeout") || msg.includes("timed out"))
    return "Upload timed out — please retry";
  if (msg.includes("413")) return "File is too large for the server";
  if (msg.includes("429")) return "Too many uploads — please wait a moment";
  if (msg.includes("500") || msg.includes("502") || msg.includes("503"))
    return "Server error — please retry";
  return err.message || "Upload failed";
}

// ── Context interface ─────────────────────────────────────────────────────────

interface PostUploadContextValue {
  uploads:               UploadItem[];
  startVideoUpload:      (p: {
    file: File; title: string; thumbnailBlob?: Blob;
    onMediaId:      (id: number) => void;
    onVaultItemId?: (id: number | null) => void;
    onError:        (e: string) => void;
    silent?:        boolean;
  }) => string;
  startPhotoUpload:      (p: {
    file: File; onMediaId: (id: number) => void; onError: (e: string) => void;
  }) => string;
  startMultiPhotoUpload: (p: {
    files: File[]; onMediaIds: (ids: number[]) => void; onError: (e: string) => void;
  }) => string;
  startTextPost:         (p: {
    label: string; onDone: () => void; onError: (e: string) => void;
  }) => string;
  startPollPost:         (p: {
    label: string; onDone: () => void; onError: (e: string) => void;
  }) => string;
  startMessageUpload:    (p: {
    files: File[]; conversationId: number; content?: string;
    isPPV?: boolean; ppvPrice?: number; tempId: string;
    onProgress: (pct: number) => void; onSent: (msg: any) => void;
    onError: (e: string) => void;
  }) => string;
  dismissUpload: (id: string) => void;
  retryUpload:   (id: string) => void;
  clearDone:     () => void;
}

const PostUploadContext = createContext<PostUploadContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function PostUploadProvider({ children }: { children: React.ReactNode }) {

  const [uploads, setUploads] = useState<UploadItem[]>(() =>
    loadPersisted().map((u) => ({
      ...u,
      // Treat in-progress uploads from previous session as errored
      phase: u.phase === "uploading" || u.phase === "processing" || u.phase === "paused"
        ? "error" : u.phase,
      error: u.phase === "uploading" || u.phase === "processing" || u.phase === "paused"
        ? "Upload interrupted — please retry" : u.error,
    }))
  );

  // ── Instance refs ──────────────────────────────────────────────────────────
  const tusInstances    = useRef<Record<string, tus.Upload>>({});
  const xhrInstances    = useRef<Record<string, XMLHttpRequest>>({});
  const pollTimers      = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const progressTracker = useRef<Record<string, { time: number; bytes: number }>>({});
  const abortedRef      = useRef<Set<string>>(new Set());

  // Callback refs for message uploads
  const progressCbs = useRef<Record<string, (pct: number) => void>>({});
  const sentCbs     = useRef<Record<string, (msg: any) => void>>({});
  const errorCbs    = useRef<Record<string, (e: string) => void>>({});

  // ── Persist to session ─────────────────────────────────────────────────────
  useEffect(() => { savePersisted(uploads); }, [uploads]);

  // ── Network online/offline detection ───────────────────────────────────────
  useEffect(() => {
    const goOffline = () => {
      setUploads((prev) => prev.map((u) =>
        u.phase === "uploading"
          ? { ...u, phase: "paused" as const, error: "Connection lost — reconnecting…" }
          : u
      ));
    };
    const goOnline = () => {
      // TUS auto-retries internally via retryDelays; we just update phase label
      setUploads((prev) => prev.map((u) =>
        u.phase === "paused"
          ? { ...u, phase: "uploading" as const, error: undefined }
          : u
      ));
    };
    window.addEventListener("offline", goOffline);
    window.addEventListener("online",  goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online",  goOnline);
    };
  }, []);

  // ── Resume stale processing uploads on mount ───────────────────────────────
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

  // ── Core helpers ───────────────────────────────────────────────────────────

  const updateUpload = useCallback((id: string, patch: Partial<UploadItem>) => {
    setUploads((prev) => prev.map((u) => u.id === id ? { ...u, ...patch } : u));
  }, []);

  const scheduleAutoDismiss = useCallback((id: string) => {
    setTimeout(() => {
      setUploads((prev) => prev.filter((u) => !(u.id === id && u.phase === "done")));
    }, 4000);
  }, []);

  const checkWatermark = useCallback(async (uploadId: string, videoId: string) => {
    try {
      const res  = await fetch(`/api/upload/video/watermark-check?videoId=${videoId}`);
      const data = await res.json();
      if (!data.hasWatermark) {
        console.warn(`⚠️ [watermark] videoId=${videoId} — no watermark detected`);
      }
    } catch (err) {
      console.error(`[watermark] check failed for videoId=${videoId}:`, err);
    }
  }, []);

  const startPolling = useCallback((uploadId: string, mediaId: number, videoId?: string) => {
    let attempts = 0;
    const MAX    = 60;
    pollTimers.current[uploadId] = setInterval(async () => {
      attempts++;
      try {
        const res  = await fetch(`/api/media/${mediaId}/status`);
        const data = await res.json();
        if (data.status === "completed") {
          clearInterval(pollTimers.current[uploadId]);
          delete pollTimers.current[uploadId];
          updateUpload(uploadId, { progress: 100, phase: "done", speedBps: undefined, eta: undefined });
          const bunnyVideoId = videoId ?? data.bunnyVideoId;
          if (bunnyVideoId) checkWatermark(uploadId, bunnyVideoId);
          scheduleAutoDismiss(uploadId);
        } else if (data.status === "failed") {
          clearInterval(pollTimers.current[uploadId]);
          delete pollTimers.current[uploadId];
          updateUpload(uploadId, { phase: "error", error: "Processing failed" });
        } else {
          setUploads((prev) =>
            prev.map((u) => u.id !== uploadId ? u : { ...u, progress: Math.min(95, u.progress + 1) })
          );
        }
        if (attempts >= MAX) {
          clearInterval(pollTimers.current[uploadId]);
          delete pollTimers.current[uploadId];
          updateUpload(uploadId, { phase: "error", error: "Processing timed out" });
        }
      } catch {}
    }, 3000);
  }, [updateUpload, checkWatermark, scheduleAutoDismiss]);

  // ── Dismiss (actually aborts the upload) ───────────────────────────────────

  const dismissUpload = useCallback(async (id: string) => {
    abortedRef.current.add(id);

    if (tusInstances.current[id]) {
      try { await tusInstances.current[id].abort(true); } catch {}
      delete tusInstances.current[id];
    }
    if (xhrInstances.current[id]) {
      xhrInstances.current[id].abort();
      delete xhrInstances.current[id];
    }
    if (pollTimers.current[id]) {
      clearInterval(pollTimers.current[id]);
      delete pollTimers.current[id];
    }

    delete progressTracker.current[id];
    delete progressCbs.current[id];
    delete sentCbs.current[id];
    delete errorCbs.current[id];

    setUploads((prev) => prev.filter((u) => u.id !== id));
  }, []);

  // ── Video upload ───────────────────────────────────────────────────────────

  const runVideoUpload = useCallback(async (
    uploadId: string, file: File, title: string, thumbnailBlob: Blob | undefined,
    onMediaId: (mediaId: number) => void, onError: (err: string) => void,
    onVaultItemId?: (id: number | null) => void,
    silent: boolean = false,
  ) => {
    try {
      // Optional thumbnail
      let customThumbnailUrl: string | null = null;
      if (thumbnailBlob) {
        try {
          const fd = new FormData();
          fd.append("file", thumbnailBlob, "thumbnail.jpg");
          const res  = await fetch("/api/upload/thumbnail", { method: "POST", body: fd });
          const data = await res.json();
          if (res.ok) customThumbnailUrl = data.url;
        } catch {}
      }

      if (abortedRef.current.has(uploadId)) return;

      // Initialise upload
      const initRes  = await fetch("/api/upload/video", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ title, customThumbnailUrl }),
      });
      const initData = await initRes.json();
      if (!initRes.ok) throw new Error(initData.error || "Failed to initialise upload");
      if (abortedRef.current.has(uploadId)) return;

      const { videoId, tusEndpoint, expireTime, signature, libraryId } = initData as {
        videoId: string; tusEndpoint: string; expireTime: number;
        signature: string; libraryId: string;
      };

      updateUpload(uploadId, { _videoId: videoId });
      progressTracker.current[uploadId] = { time: Date.now(), bytes: 0 };

      // TUS upload
      await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(file, {
          endpoint:    tusEndpoint,
          chunkSize:   10 * 1024 * 1024, // 10 MB chunks — faster than 5 MB on good connections
          retryDelays: [0, 3000, 5000, 10000, 20000],
          storeFingerprintForResuming: false,
          headers: {
            AuthorizationSignature: signature,
            AuthorizationExpire:    String(expireTime),
            VideoId:                videoId,
            LibraryId:              libraryId,
          },
          metadata: { filetype: file.type, title },
          onProgress(bytesUploaded, bytesTotal) {
            if (abortedRef.current.has(uploadId)) return;
            const now     = Date.now();
            const tracker = progressTracker.current[uploadId];
            let speedBps: number | undefined;
            let eta: number | undefined;
            if (tracker) {
              const dt = (now - tracker.time) / 1000;
              const db = bytesUploaded - tracker.bytes;
              if (dt > 0.5 && db > 0) {
                speedBps = db / dt;
                const remaining = bytesTotal - bytesUploaded;
                eta = speedBps > 0 ? Math.round(remaining / speedBps) : undefined;
              }
            }
            progressTracker.current[uploadId] = { time: now, bytes: bytesUploaded };
            updateUpload(uploadId, {
              progress: Math.round((bytesUploaded / bytesTotal) * 80),
              speedBps,
              eta,
            });
          },
          onSuccess() {
            fetch("/api/upload/video/log", {
              method:  "POST",
              headers: { "Content-Type": "application/json" },
              body:    JSON.stringify({ event: "tus_success", videoId, fileSize: file.size }),
            }).catch(() => {});
            resolve();
          },
          onError(err) {
  if (abortedRef.current.has(uploadId)) { resolve(); return; }
  const body = (err as any).originalResponse?.getBody?.() ?? "no body";
  const responseCode = (err as any).originalResponse?.getStatus?.() ?? "n/a";
  fetch("/api/upload/video/log", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ event: "tus_error", videoId, message: err.message, responseBody: body }),
  }).catch(() => {});
  const isNetwork = responseCode === "n/a" || String(responseCode) === "0";
  reject(new Error(isNetwork ? "Network error — check your connection and retry" : `Upload failed: ${err.message} — ${body}`));
},
        });

        tusInstances.current[uploadId] = upload;
        upload.start();
      });

      delete tusInstances.current[uploadId];
      delete progressTracker.current[uploadId];
      if (abortedRef.current.has(uploadId)) return;

      // Mark processing
      updateUpload(uploadId, { progress: 82, phase: "processing", speedBps: undefined, eta: undefined });

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
      onVaultItemId?.(completeData.vaultItemId ?? null);
      if (!silent) startPolling(uploadId, mediaId, videoId);

    } catch (err) {
      if (abortedRef.current.has(uploadId)) return;
      const msg = classifyError(err);
      updateUpload(uploadId, { phase: "error", error: msg, speedBps: undefined, eta: undefined });
      onError(msg);
    }
  }, [updateUpload, startPolling]);

  const startVideoUpload = useCallback(({
    file, title, thumbnailBlob, onMediaId, onVaultItemId, onError, silent = false,
  }: {
    file: File; title: string; thumbnailBlob?: Blob;
    onMediaId:      (id: number) => void;
    onVaultItemId?: (id: number | null) => void;
    onError:        (e: string) => void;
    silent?:        boolean;
  }): string => {
    const uploadId = `upload_${Date.now()}_${Math.random()}`;
    if (!silent) {
      setUploads((prev) => [...prev, {
        id: uploadId, fileName: file.name, progress: 0, phase: "uploading",
        file, _title: title, _onMediaId: onMediaId, _onError: onError,
        _thumbnailBlob: thumbnailBlob,
      }]);
    }
    runVideoUpload(uploadId, file, title, thumbnailBlob, onMediaId, onError, onVaultItemId, silent);
    return uploadId;
  }, [runVideoUpload]);

  // ── Photo upload — XHR for real progress tracking and abort support ────────

  const runPhotoUpload = useCallback(async (
    uploadId: string, file: File,
    onMediaId: (id: number) => void, onError: (err: string) => void,
  ) => {
    try {
      updateUpload(uploadId, { progress: 5 });
      const compressed = await compressPhotoIfNeeded(file);
      if (abortedRef.current.has(uploadId)) return;
      updateUpload(uploadId, { progress: 15 });

      const formData = new FormData();
      formData.append("file", compressed);
      progressTracker.current[uploadId] = { time: Date.now(), bytes: 0 };

      const data = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrInstances.current[uploadId] = xhr;

        xhr.upload.onprogress = (e) => {
          if (!e.lengthComputable || abortedRef.current.has(uploadId)) return;
          const now     = Date.now();
          const tracker = progressTracker.current[uploadId];
          let speedBps: number | undefined;
          let eta: number | undefined;
          if (tracker) {
            const dt = (now - tracker.time) / 1000;
            const db = e.loaded - tracker.bytes;
            if (dt > 0.3 && db > 0) {
              speedBps = db / dt;
              const remaining = e.total - e.loaded;
              eta = speedBps > 0 ? Math.round(remaining / speedBps) : undefined;
            }
          }
          progressTracker.current[uploadId] = { time: now, bytes: e.loaded };
          updateUpload(uploadId, {
            progress: 15 + Math.round((e.loaded / e.total) * 75),
            speedBps,
            eta,
          });
        };

        xhr.onload = () => {
          delete xhrInstances.current[uploadId];
          try {
            const json = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) resolve(json);
            else reject(new Error(json.error ?? `Server error (${xhr.status})`));
          } catch {
            reject(new Error(`Server error (${xhr.status})`));
          }
        };
        xhr.onerror   = () => { delete xhrInstances.current[uploadId]; reject(new Error("Network error — check your connection")); };
        xhr.ontimeout = () => { delete xhrInstances.current[uploadId]; reject(new Error("Upload timed out — please retry")); };
        xhr.onabort   = () => { delete xhrInstances.current[uploadId]; reject(new Error("Upload cancelled")); };
        xhr.timeout   = 120_000;
        xhr.open("POST", "/api/upload/photo");
        xhr.send(formData);
      });

      if (abortedRef.current.has(uploadId)) return;
      delete progressTracker.current[uploadId];

      const mediaId = data.results?.[0]?.mediaId;
      if (!mediaId) throw new Error("No media ID returned from upload");

      updateUpload(uploadId, { progress: 100, phase: "done", mediaId, speedBps: undefined, eta: undefined });
      onMediaId(mediaId);
      scheduleAutoDismiss(uploadId);

    } catch (err) {
      if (abortedRef.current.has(uploadId)) return;
      const msg = classifyError(err);
      updateUpload(uploadId, { phase: "error", error: msg, speedBps: undefined, eta: undefined });
      onError(msg);
    }
  }, [updateUpload, scheduleAutoDismiss]);

  const startPhotoUpload = useCallback(({ file, onMediaId, onError }: {
    file: File; onMediaId: (id: number) => void; onError: (e: string) => void;
  }): string => {
    const uploadId = `upload_${Date.now()}_${Math.random()}`;
    setUploads((prev) => [...prev, {
      id: uploadId, fileName: file.name, progress: 0, phase: "uploading",
      file, _onMediaId: onMediaId, _onError: onError, _isPhoto: true,
    }]);
    runPhotoUpload(uploadId, file, onMediaId, onError);
    return uploadId;
  }, [runPhotoUpload]);

  // ── Multi-photo upload ─────────────────────────────────────────────────────

  const runMultiPhotoUpload = useCallback(async (
    uploadId: string, files: File[],
    onMediaIds: (ids: number[]) => void, onError: (err: string) => void,
  ) => {
    try {
      updateUpload(uploadId, { progress: 5 });
      const compressed = await Promise.all(files.map((f) => compressPhotoIfNeeded(f)));
      if (abortedRef.current.has(uploadId)) return;
      updateUpload(uploadId, { progress: 15 });

      const formData = new FormData();
      for (const f of compressed) formData.append("file", f);
      progressTracker.current[uploadId] = { time: Date.now(), bytes: 0 };

      const data = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrInstances.current[uploadId] = xhr;

        xhr.upload.onprogress = (e) => {
          if (!e.lengthComputable || abortedRef.current.has(uploadId)) return;
          const now     = Date.now();
          const tracker = progressTracker.current[uploadId];
          let speedBps: number | undefined;
          let eta: number | undefined;
          if (tracker) {
            const dt = (now - tracker.time) / 1000;
            const db = e.loaded - tracker.bytes;
            if (dt > 0.3 && db > 0) {
              speedBps = db / dt;
              const remaining = e.total - e.loaded;
              eta = speedBps > 0 ? Math.round(remaining / speedBps) : undefined;
            }
          }
          progressTracker.current[uploadId] = { time: now, bytes: e.loaded };
          updateUpload(uploadId, {
            progress: 15 + Math.round((e.loaded / e.total) * 75),
            speedBps,
            eta,
          });
        };

        xhr.onload = () => {
          delete xhrInstances.current[uploadId];
          try {
            const json = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) resolve(json);
            else reject(new Error(json.error ?? `Server error (${xhr.status})`));
          } catch {
            reject(new Error(`Server error (${xhr.status})`));
          }
        };
        xhr.onerror   = () => { delete xhrInstances.current[uploadId]; reject(new Error("Network error — check your connection")); };
        xhr.ontimeout = () => { delete xhrInstances.current[uploadId]; reject(new Error("Upload timed out — please retry")); };
        xhr.onabort   = () => { delete xhrInstances.current[uploadId]; reject(new Error("Upload cancelled")); };
        xhr.timeout   = 120_000;
        xhr.open("POST", "/api/upload/photo");
        xhr.send(formData);
      });

      if (abortedRef.current.has(uploadId)) return;
      delete progressTracker.current[uploadId];

      const mediaIds: number[] = (data.results as { mediaId: number }[]).map((r) => r.mediaId);
      if (!mediaIds.length) throw new Error("No media IDs returned from upload");

      updateUpload(uploadId, { progress: 100, phase: "done", speedBps: undefined, eta: undefined });
      onMediaIds(mediaIds);
      scheduleAutoDismiss(uploadId);

    } catch (err) {
      if (abortedRef.current.has(uploadId)) return;
      const msg = classifyError(err);
      updateUpload(uploadId, { phase: "error", error: msg, speedBps: undefined, eta: undefined });
      onError(msg);
    }
  }, [updateUpload, scheduleAutoDismiss]);

  const startMultiPhotoUpload = useCallback(({ files, onMediaIds, onError }: {
    files: File[]; onMediaIds: (ids: number[]) => void; onError: (e: string) => void;
  }): string => {
    const uploadId = `upload_${Date.now()}_${Math.random()}`;
    setUploads((prev) => [...prev, {
      id: uploadId, fileName: `${files.length} photos`, progress: 0, phase: "uploading",
      files, _onMediaIds: onMediaIds, _onError: onError, _isMultiPhoto: true,
    }]);
    runMultiPhotoUpload(uploadId, files, onMediaIds, onError);
    return uploadId;
  }, [runMultiPhotoUpload]);

  // ── Text post ──────────────────────────────────────────────────────────────

  const runTextPost = useCallback(async (
    uploadId: string, onDone: () => void, onError: (e: string) => void,
  ) => {
    try {
      updateUpload(uploadId, { progress: 50 });
      await new Promise((r) => setTimeout(r, 400));
      updateUpload(uploadId, { progress: 100, phase: "done" });
      onDone();
      scheduleAutoDismiss(uploadId);
    } catch (err) {
      const msg = classifyError(err);
      updateUpload(uploadId, { phase: "error", error: msg });
      onError(msg);
    }
  }, [updateUpload, scheduleAutoDismiss]);

  const startTextPost = useCallback(({ label, onDone, onError }: {
    label: string; onDone: () => void; onError: (e: string) => void;
  }): string => {
    const uploadId = `upload_${Date.now()}_${Math.random()}`;
    setUploads((prev) => [...prev, {
      id: uploadId, fileName: label, progress: 0, phase: "uploading",
      _isText: true, _onDone: onDone, _onError: onError,
    }]);
    runTextPost(uploadId, onDone, onError);
    return uploadId;
  }, [runTextPost]);

  // ── Poll post ──────────────────────────────────────────────────────────────

  const runPollPost = useCallback(async (
    uploadId: string, onDone: () => void, onError: (e: string) => void,
  ) => {
    try {
      updateUpload(uploadId, { progress: 50 });
      await new Promise((r) => setTimeout(r, 400));
      updateUpload(uploadId, { progress: 100, phase: "done" });
      onDone();
      scheduleAutoDismiss(uploadId);
    } catch (err) {
      const msg = classifyError(err);
      updateUpload(uploadId, { phase: "error", error: msg });
      onError(msg);
    }
  }, [updateUpload, scheduleAutoDismiss]);

  const startPollPost = useCallback(({ label, onDone, onError }: {
    label: string; onDone: () => void; onError: (e: string) => void;
  }): string => {
    const uploadId = `upload_${Date.now()}_${Math.random()}`;
    setUploads((prev) => [...prev, {
      id: uploadId, fileName: label, progress: 0, phase: "uploading",
      _isPoll: true, _onDone: onDone, _onError: onError,
    }]);
    runPollPost(uploadId, onDone, onError);
    return uploadId;
  }, [runPollPost]);

  // ── Message upload ─────────────────────────────────────────────────────────

  const runMessageUpload = useCallback(async (
    uploadId: string, files: File[], conversationId: number,
    content: string | undefined, isPPV: boolean,
    ppvPrice: number | undefined, tempId: string,
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
        xhrInstances.current[uploadId] = xhr;

        xhr.upload.onprogress = (e) => {
          if (!e.lengthComputable || abortedRef.current.has(uploadId)) return;
          const pct = Math.round((e.loaded / e.total) * 90);
          updateUpload(uploadId, { progress: pct });
          onProgress?.(pct);
        };

        xhr.onload = () => {
          delete xhrInstances.current[uploadId];
          try {
            const json = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) resolve(json);
            else reject(new Error(json.error ?? `Upload failed (${xhr.status})`));
          } catch {
            reject(new Error(`Upload failed (${xhr.status})`));
          }
        };
        xhr.onerror   = () => { delete xhrInstances.current[uploadId]; reject(new Error("Network error")); };
        xhr.ontimeout = () => { delete xhrInstances.current[uploadId]; reject(new Error("Upload timed out")); };
        xhr.onabort   = () => { delete xhrInstances.current[uploadId]; reject(new Error("Upload cancelled")); };
        xhr.timeout   = 120_000;
        xhr.open("POST", endpoint);
        xhr.send(formData);
      });

      if (abortedRef.current.has(uploadId)) return;
      updateUpload(uploadId, { progress: 100, phase: "done" });
      onProgress?.(100);
      onSent?.({ ...data.message, tempId });

    } catch (err) {
      if (abortedRef.current.has(uploadId)) return;
      const msg = classifyError(err);
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
    files: File[]; conversationId: number; content?: string;
    isPPV?: boolean; ppvPrice?: number; tempId: string;
    onProgress: (pct: number) => void; onSent: (msg: any) => void; onError: (e: string) => void;
  }): string => {
    const uploadId = `msg_${Date.now()}_${Math.random()}`;
    progressCbs.current[uploadId] = onProgress;
    sentCbs.current[uploadId]     = onSent;
    errorCbs.current[uploadId]    = onError;
    setUploads((prev) => [...prev, {
      id: uploadId,
      fileName: `${files.length} file${files.length > 1 ? "s" : ""}`,
      progress: 0, phase: "uploading",
      files, _isMessage: true, _conversationId: conversationId,
      _isPPV: isPPV, _ppvPrice: ppvPrice, _content: content, _tempId: tempId,
    }]);
    runMessageUpload(uploadId, files, conversationId, content, isPPV, ppvPrice, tempId);
    return uploadId;
  }, [runMessageUpload]);

  // ── Retry ──────────────────────────────────────────────────────────────────

  const retryUpload = useCallback((id: string) => {
    abortedRef.current.delete(id);
    setUploads((prev) => {
      const item = prev.find((u) => u.id === id);
      if (!item) return prev;

      // Schedule async upload after state update
      setTimeout(() => {
        if (item._isMessage && item.files && item._conversationId && item._tempId) {
          runMessageUpload(id, item.files, item._conversationId, item._content, item._isPPV ?? false, item._ppvPrice, item._tempId);
        } else if (item._isText && item._onDone && item._onError) {
          runTextPost(id, item._onDone, item._onError);
        } else if (item._isPoll && item._onDone && item._onError) {
          runPollPost(id, item._onDone, item._onError);
        } else if (item._isMultiPhoto && item.files && item._onMediaIds && item._onError) {
          runMultiPhotoUpload(id, item.files, item._onMediaIds, item._onError);
        } else if (item._isPhoto && item.file && item._onMediaId && item._onError) {
          runPhotoUpload(id, item.file, item._onMediaId, item._onError);
        } else if (item.file && item._title && item._onMediaId && item._onError) {
          runVideoUpload(id, item.file, item._title, item._thumbnailBlob, item._onMediaId, item._onError);
        }
      }, 0);

      return prev.map((u) =>
        u.id === id
          ? { ...u, progress: 0, phase: "uploading" as const, error: undefined, speedBps: undefined, eta: undefined }
          : u
      );
    });
  }, [runVideoUpload, runPhotoUpload, runMultiPhotoUpload, runTextPost, runPollPost, runMessageUpload]);

  const clearDone = useCallback(() => {
    setUploads((prev) => prev.filter((u) => u.phase !== "done"));
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <PostUploadContext.Provider value={{
      uploads,
      startVideoUpload,
      startPhotoUpload,
      startMultiPhotoUpload,
      startTextPost,
      startPollPost,
      startMessageUpload,
      dismissUpload,
      retryUpload,
      clearDone,
    }}>
      {children}
    </PostUploadContext.Provider>
  );
}

export function usePostUpload() {
  const ctx = useContext(PostUploadContext);
  if (!ctx) throw new Error("usePostUpload must be used inside PostUploadProvider");
  return ctx;
}

// Backward-compat alias — existing files importing useUpload still work
export { usePostUpload as useUpload };
export { PostUploadProvider as UploadProvider };