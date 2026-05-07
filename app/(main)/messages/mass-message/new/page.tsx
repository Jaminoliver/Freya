"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, Image as ImageIcon, Lock, Calendar, X, Users, Clock, Upload } from "lucide-react";
import { VaultPicker } from "@/components/vault/VaultPicker";
import { usePostUpload } from "@/lib/context/PostUploadContext";

import { MassMessageStyles }            from "@/components/messages/mass-messages/Styles";
import { ToolbarBtn }                   from "@/components/messages/mass-messages/ToolbarBtn";
import { PreviewBubble, type VaultItemWithPreview } from "@/components/messages/mass-messages/PreviewBubble";
import { AudienceSheet, SEGMENT_LABEL } from "@/components/messages/mass-messages/AudienceSheet";
import { ScheduleSheet }                from "@/components/messages/mass-messages/ScheduleSheet";
import type { Segment }                 from "@/components/messages/mass-messages/AudienceSheet";



function mergeUnique(a: VaultItemWithPreview[], b: VaultItemWithPreview[]): VaultItemWithPreview[] {
  const seen = new Set(a.map((x) => Number(x.id)));
  const out  = [...a];
  for (const item of b) {
    if (!seen.has(Number(item.id))) {
      out.push(item);
      seen.add(Number(item.id));
    }
  }
  return out;
}

function formatScheduledShort(d: Date): string {
  const now      = new Date();
  const sameDay  = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
  if (sameDay)    return `Today ${time}`;
  if (isTomorrow) return `Tomorrow ${time}`;
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) + ` ${time}`;
}

export default function MassMessageComposePage() {
  const router = useRouter();
  const { startVideoUpload } = usePostUpload();

  const [text,                  setText]                  = useState("");
  const [selected,              setSelected]              = useState<VaultItemWithPreview[]>([]);
  const [segment,               setSegment]               = useState<Segment>("active_subscribers");
  const [excludeActiveChatters, setExcludeActiveChatters] = useState(true);
  const [scheduledFor,          setScheduledFor]          = useState<Date | null>(null);
  const [isPPV,                 setIsPPV]                 = useState(false);
  const [ppvPrice,              setPpvPrice]              = useState("");
  const [audienceCount,         setAudienceCount]         = useState<number | null>(null);
  const [countLoading,          setCountLoading]          = useState(false);
  const [vaultOpen,             setVaultOpen]             = useState(false);
  const [audienceOpen,          setAudienceOpen]          = useState(false);
  const [scheduleOpen,          setScheduleOpen]          = useState(false);
  const [sending,               setSending]               = useState(false);
  const [showSent,              setShowSent]              = useState(false);
  const [error,                 setError]                 = useState<string | null>(null);
  const [uploading,             setUploading]             = useState(false);
  const [uploadProgress,        setUploadProgress]        = useState(0);
  // Local files picked from device — held until Send, never auto-uploaded
  const [localFiles, setLocalFiles] = useState<{ file: File; objectURL: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
const [videoProgress, setVideoProgress] = useState(0);
const videoProgressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Add local files to preview (no upload yet) ─────────────────────────────
  const handleUploadFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newEntries = Array.from(files).map((f) => ({ file: f, objectURL: URL.createObjectURL(f) }));
    setLocalFiles((prev) => [...prev, ...newEntries]);
  }, []);

  const removeLocalFile = useCallback((idx: number) => {
    setLocalFiles((prev) => {
      URL.revokeObjectURL(prev[idx].objectURL);
      return prev.filter((_, i) => i !== idx);
    });
  }, []);

  // ── Upload all files via XHR (iOS Safari + Vercel reliability) ──────────
  const uploadAllFiles = useCallback(async (files: File[]): Promise<VaultItemWithPreview[]> => {
    const fd = new FormData();
    for (const f of files) fd.append("file", f);
    fd.append("skipVault", "true");

    setUploadProgress(5);

    const data = await new Promise<any>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) => {
        if (!e.lengthComputable) return;
        const pct = Math.round((e.loaded / e.total) * 90);
        setUploadProgress(Math.max(5, pct));
      };
      xhr.onload = () => {
        try {
          const json = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) resolve(json);
          else reject(new Error(json?.error ?? `Upload failed (${xhr.status})`));
        } catch {
          reject(new Error(`Invalid response (${xhr.status}): ${xhr.responseText?.slice(0, 200) || "(empty)"}`));
        }
      };
      xhr.onerror   = () => reject(new Error("Network error — check your connection"));
      xhr.ontimeout = () => reject(new Error("Upload timed out — try again"));
      xhr.onabort   = () => reject(new Error("Upload cancelled"));
      xhr.timeout   = 180_000;
      xhr.open("POST", "/api/upload/photo");
      xhr.send(fd);
    });

    setUploadProgress(100);

    return (data.results ?? [])
      .filter((r: any) => r.vaultItemId)
      .map((r: any) => ({
        id:               r.vaultItemId,
        media_type:       r.mediaType ?? "photo",
        file_url:         r.url,
        thumbnail_url:    r.thumbnailUrl ?? null,
        width:            null,
        height:           null,
        duration_seconds: null,
        blur_hash:        null,
        aspect_ratio:     null,
        bunny_video_id:   r.bunnyVideoId ?? null,
        created_at:       new Date().toISOString(),
        last_used_at:     null,
      } as VaultItemWithPreview));
  }, []);

  // ── Live audience count ────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setCountLoading(true);
    fetch("/api/mass-messages/audience-count", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ audience_segment: segment, exclude_active_chatters: excludeActiveChatters }),
    })
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setAudienceCount(data.count ?? 0); })
      .catch(() => { if (!cancelled) setAudienceCount(0); })
      .finally(() => { if (!cancelled) setCountLoading(false); });
    return () => { cancelled = true; };
  }, [segment, excludeActiveChatters]);

  // ── Validation ─────────────────────────────────────────────────────────────
  const totalMediaCount = selected.length + localFiles.length;
  const hasContent = text.trim().length > 0 || selected.length > 0 || localFiles.length > 0;
  const ppvValid   = !isPPV || ((selected.length > 0 || localFiles.length > 0) && Number(ppvPrice) >= 100);
  const canSend    = hasContent && ppvValid && (audienceCount ?? 0) > 0 && !sending && !uploading && !showSent;

  // ── Send — upload local files first, then dispatch ────────────────────────
  const handleSend = useCallback(async () => {
    if (!canSend) return;
    setSending(true);
    setUploading(localFiles.length > 0);
    setUploadProgress(0);
    setError(null);
    // Snapshot previews into bubble immediately
    const snapshotFiles = [...localFiles];
    setPendingBubbleURLs(snapshotFiles.map((e) => e.objectURL));
    setPendingSnapshot(snapshotFiles);
    try {
      let uploadedItems: VaultItemWithPreview[] = [];

      if (localFiles.length > 0) {
        const photoEntries = localFiles.filter((e) => !e.file.type.startsWith("video/"));
        const videoEntries = localFiles.filter((e) =>  e.file.type.startsWith("video/"));

        // Photos via XHR to /api/upload/photo
        const photoPromise = photoEntries.length > 0
          ? uploadAllFiles(photoEntries.map((e) => e.file))
          : Promise.resolve([] as VaultItemWithPreview[]);

        // Videos via TUS through PostUploadContext (chunked direct to Bunny)
        const videoPromises = videoEntries.map((entry) =>
          new Promise<VaultItemWithPreview>((resolve, reject) => {
            startVideoUpload({
              file:  entry.file,
              title: entry.file.name,
              silent: true,
              onMediaId:     () => {},
              onVaultItemId: (vaultItemId) => {
                if (vaultItemId == null) {
                  reject(new Error("Video uploaded but vault id missing"));
                  return;
                }
                resolve({
                  id:               vaultItemId,
                  media_type:       "video",
                  file_url:         "",
                  thumbnail_url:    null,
                  width:            null,
                  height:           null,
                  duration_seconds: null,
                  blur_hash:        null,
                  aspect_ratio:     null,
                  bunny_video_id:   null,
                  created_at:       new Date().toISOString(),
                  last_used_at:     null,
                } as VaultItemWithPreview);
              },
              onError: (msg) => { clearInterval(videoProgressTimer.current!); reject(new Error(msg)); },
            });
            let vp = 0;
            videoProgressTimer.current = setInterval(() => {
              const step = vp < 40 ? Math.random() * 3 + 2 : vp < 80 ? Math.random() * 1.2 + 0.5 : vp < 95 ? Math.random() * 0.3 + 0.05 : 0;
              vp = Math.min(95, vp + step);
              setVideoProgress(Math.round(vp));
            }, 300);
          })
        );

        const [photoItems, ...videoItems] = await Promise.all([photoPromise, ...videoPromises]);
        uploadedItems.push(...photoItems, ...videoItems);
        setLocalFiles([]);
      }

      setUploading(false);

      const allVaultItems = [...selected.filter((v) => Number(v.id) > 0), ...uploadedItems];

      const res = await fetch("/api/mass-messages", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text:                    text.trim() || null,
          ppv_price_kobo:          isPPV ? Math.round(Number(ppvPrice) * 100) : null,
          audience_segment:        segment,
          exclude_active_chatters: excludeActiveChatters,
          scheduled_for:           scheduledFor ? scheduledFor.toISOString() : null,
          vault_item_ids:          allVaultItems.map((v) => Number(v.id)),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      setShowSent(true);
      setPendingBubbleURLs([]);
      setTimeout(() => {
        setShowSent(false);
        setText("");
        setSelected([]);
        setLocalFiles([]);
        setPendingSnapshot([]);
        setIsPPV(false);
        setPpvPrice("");
        setScheduledFor(null);
        setError(null);
      }, 2000);
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong");
    } finally {
      setSending(false);
      setUploading(false);
      setUploadProgress(0);
    }
  }, [canSend, text, isPPV, ppvPrice, segment, excludeActiveChatters, scheduledFor, selected, localFiles, uploadAllFiles]);

  const removeSelected = (id: number | bigint) => {
    setSelected((prev) => {
      const item = prev.find((v) => Number(v.id) === Number(id));
      if (item?.objectURL) URL.revokeObjectURL(item.objectURL);
      return prev.filter((v) => Number(v.id) !== Number(id));
    });
  };

  // Snapshot of localFiles shown in preview bubble while uploading/sending
  const [pendingBubbleURLs, setPendingBubbleURLs] = useState<string[]>([]);
  const [pendingSnapshot,   setPendingSnapshot]   = useState<{ file: File; objectURL: string }[]>([]);

  const previewForBubble: VaultItemWithPreview[] = sending || showSent
    ? [
        ...selected.map((v) => {
          const streamThumb = v.bunny_video_id
            ? `https://vz-8bc100f4-3c0.b-cdn.net/${v.bunny_video_id}/thumbnail.jpg`
            : null;
          const thumb = v.objectURL ?? v.thumbnail_url ?? streamThumb ?? (v.media_type !== "video" ? v.file_url : null) ?? undefined;
          return { ...v, objectURL: thumb };
        }),
        ...pendingBubbleURLs.map((url, i) => {
          const entry = pendingSnapshot[i];
          const isVideo = entry?.file.type.startsWith("video") ?? false;
          return {
            id:               BigInt(-(i + 1)),
            media_type:       isVideo ? "video" as const : "photo" as const,
            file_url:         url,
            thumbnail_url:    url,
            width:            null,
            height:           null,
            duration_seconds: null,
            blur_hash:        null,
            aspect_ratio:     null,
            bunny_video_id:   null,
            created_at:       new Date().toISOString(),
            last_used_at:     null,
            objectURL:        url,
          };
        }),
      ]
    : [];

  const sendLabel = showSent
    ? "Sent ✓"
    : uploading
    ? `Uploading${uploadProgress > 0 ? ` ${uploadProgress}%` : "…"}`
    : sending
    ? "Sending…"
    : scheduledFor
    ? "Schedule"
    : "Send";

  const sendBg = showSent
    ? "linear-gradient(135deg, #10B981 0%, #059669 100%)"
    : canSend
    ? "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)"
    : "#1F1F2A";

  return (
    <>
      <MassMessageStyles />

      <div style={{
        maxWidth:        "680px",
        margin:          "0 auto",
        backgroundColor: "#0A0A0F",
        fontFamily:      "'Inter', sans-serif",
        width:           "100%",
        height:          "100%",
        display:         "flex",
        flexDirection:   "column",
        boxSizing:       "border-box" as const,
      }}>
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{
          flexShrink:           0,
          backgroundColor:      "rgba(10,10,15,0.92)",
          backdropFilter:       "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          padding:              "12px 16px",
          paddingTop:           "calc(12px + env(safe-area-inset-top, 0px))",
          display:              "flex",
          alignItems:           "center",
          justifyContent:       "space-between",
          borderBottom:         "1px solid #1F1F2A",
        }}>
          <button
            onClick={() => router.back()}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#D4D4E8", display: "flex", padding: "4px" }}
          >
            <ArrowLeft size={24} strokeWidth={2} />
          </button>
          <span style={{ fontSize: "17px", fontWeight: 700, color: "#FFFFFF" }}>Mass message</span>
          <button
            onClick={handleSend}
            disabled={!canSend}
            style={{
              padding:      "8px 18px",
              borderRadius: "20px",
              border:       "none",
              background:   sendBg,
              color:        (canSend || showSent) ? "#FFFFFF" : "#4A4A6A",
              fontSize:     "14px",
              fontWeight:   700,
              cursor:       canSend ? "pointer" : "default",
              fontFamily:   "inherit",
              transition:   "background 0.2s ease",
              display:      "flex",
              alignItems:   "center",
              gap:          "6px",
            }}
          >
            {(sending || uploading) && (
              <svg width="14" height="14" viewBox="0 0 14 14" style={{ animation: "mmSpin 0.8s linear infinite", flexShrink: 0 }}>
                <circle cx="7" cy="7" r="5.5" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
                <path d="M7 1.5a5.5 5.5 0 0 1 5.5 5.5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
            {sendLabel}
          </button>
        </div>

        {/* ── Scrollable body ─────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: "auto", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }}>
        {/* ── Audience chip ────────────────────────────────────────────────── */}
        <div style={{ padding: "14px 16px 8px", display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
          <span style={{ fontSize: "13px", color: "#6B6B8A", fontWeight: 600 }}>To:</span>
          <button
            onClick={() => setAudienceOpen(true)}
            style={{
              display:      "flex",
              alignItems:   "center",
              gap:          "6px",
              padding:      "7px 12px",
              borderRadius: "20px",
              border:       "1px solid #2A2A3D",
              background:   "#1A1A2E",
              color:        "#FFFFFF",
              fontSize:     "13px",
              fontWeight:   600,
              cursor:       "pointer",
              fontFamily:   "inherit",
            }}
          >
            <Users size={13} strokeWidth={2} color="#8B5CF6" />
            {SEGMENT_LABEL[segment]}
            <ChevronDown size={13} strokeWidth={2} color="#8A8AA0" />
          </button>
          <span style={{
            fontSize:   "12px",
            color:      (audienceCount ?? 0) > 0 ? "#8B5CF6" : "#EF4444",
            fontWeight: 600,
            opacity:    countLoading ? 0.5 : 1,
            transition: "opacity 0.15s ease",
          }}>
            {countLoading ? "…" : `${audienceCount ?? 0} ${(audienceCount ?? 0) === 1 ? "fan" : "fans"}`}
          </span>

          {scheduledFor && (
            <button
              onClick={() => setScheduleOpen(true)}
              style={{
                display:      "flex",
                alignItems:   "center",
                gap:          "5px",
                padding:      "7px 12px",
                borderRadius: "20px",
                border:       "1px solid rgba(139,92,246,0.4)",
                background:   "rgba(139,92,246,0.12)",
                color:        "#8B5CF6",
                fontSize:     "12px",
                fontWeight:   600,
                cursor:       "pointer",
                fontFamily:   "inherit",
                marginLeft:   "auto",
              }}
            >
              <Clock size={12} strokeWidth={2} />
              {formatScheduledShort(scheduledFor)}
              <X size={12} strokeWidth={2.5} onClick={(e) => { e.stopPropagation(); setScheduledFor(null); }} />
            </button>
          )}
        </div>

        {/* ── Live preview ─────────────────────────────────────────────────── */}
        <div style={{ padding: "8px 16px 12px" }}>
          <div style={{ fontSize: "11px", color: "#4A4A6A", marginBottom: "6px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Preview</div>
          <PreviewBubble text={text} media={previewForBubble} isPPV={isPPV} ppvPrice={ppvPrice} uploadProgress={uploadProgress} isSending={uploading || sending} isSent={showSent} />
        </div>

        {/* ── Composer ─────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", padding: "0 16px 16px", gap: "12px" }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your message…"
            rows={4}
            style={{
              width:           "100%",
              backgroundColor: "#0D0D18",
              border:          "1px solid #1F1F2A",
              borderRadius:    "14px",
              padding:         "14px",
              color:           "#FFFFFF",
              fontSize:        "16px",
              lineHeight:      1.5,
              resize:          "none",
              fontFamily:      "inherit",
              outline:         "none",
              caretColor:      "#8B5CF6",
            }}
          />

          {/* Selected media thumbnails — vault items + local files */}
          {(selected.length > 0 || localFiles.length > 0) && (
            <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
              {selected.map((v) => {
                const isVaultVideo = v.media_type === "video";
                const streamThumb = v.bunny_video_id ? `https://vz-8bc100f4-3c0.b-cdn.net/${v.bunny_video_id}/thumbnail.jpg` : null;
                const src = v.objectURL ?? v.thumbnail_url ?? streamThumb ?? (!isVaultVideo ? v.file_url : null);
                return (
                  <div key={Number(v.id)} style={{ position: "relative", width: "72px", height: "72px", flexShrink: 0, borderRadius: "10px", overflow: "hidden", backgroundColor: "#1A1A2E" }}>
                    {src
                      ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : isVaultVideo && (
                          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#8B5CF6" }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="#8B5CF6"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                          </div>
                        )
                    }
                    <button
                      onClick={() => removeSelected(v.id)}
                      style={{ position: "absolute", top: "4px", right: "4px", width: "20px", height: "20px", borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.7)", border: "none", color: "#FFF", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                    >
                      <X size={11} strokeWidth={2.5} />
                    </button>
                  </div>
                );
              })}
              {localFiles.map(({ file: f, objectURL: src }, idx) => (
                  <div key={`local-${idx}-${f.name}`} style={{ position: "relative", width: "72px", height: "72px", flexShrink: 0, borderRadius: "10px", overflow: "hidden", backgroundColor: "#1A1A2E" }}>
                    {f.type.startsWith("video")
                      ? <video src={src} muted playsInline preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover" }} onLoadedMetadata={(e) => { (e.currentTarget as HTMLVideoElement).currentTime = 0.5; }} />
                      : <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    }
                    {f.type.startsWith("video") && (
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="#FFFFFF" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))" }}><polygon points="5 3 19 12 5 21 5 3"/></svg>
                      </div>
                    )}
                    <button
                      onClick={() => removeLocalFile(idx)}
                      style={{ position: "absolute", top: "4px", right: "4px", width: "20px", height: "20px", borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.7)", border: "none", color: "#FFF", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                    >
                      <X size={11} strokeWidth={2.5} />
                    </button>
                  </div>
                ))}
            </div>
          )}

          {/* Upload progress bar — shown only while sending */}
          {uploading && (
            <div style={{ height: "3px", borderRadius: "2px", backgroundColor: "#1F1F2A", overflow: "hidden" }}>
              {(() => {
                const p = videoProgress > 0 ? videoProgress : uploadProgress;
                const done = p >= 100;
                return <div style={{ height: "100%", width: `${p}%`, background: done ? "#22C55E" : "#8B5CF6", borderRadius: "2px", transition: "width 0.3s ease, background 0.3s ease" }} />;
              })()}
            </div>
          )}

          {/* PPV price input */}
          {isPPV && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", backgroundColor: "#1A1A2E", borderRadius: "10px" }}>
              <span style={{ color: "#9090B0", fontSize: "15px", fontWeight: 600 }}>₦</span>
              <input
                type="number"
                inputMode="numeric"
                min="100"
                max="50000"
                value={ppvPrice}
                onChange={(e) => setPpvPrice(e.target.value)}
                placeholder="Set price"
                style={{
                  flex:       1,
                  background: "transparent",
                  border:     "none",
                  outline:    "none",
                  color:      "#FFFFFF",
                  fontSize:   "16px",
                  fontFamily: "inherit",
                  caretColor: "#8B5CF6",
                }}
              />
              {(selected.length + localFiles.length) === 0 && (
                <span style={{ fontSize: "11px", color: "#EF4444" }}>Add media first</span>
              )}
            </div>
          )}

          {/* Toolbar */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            style={{ display: "none" }}
            onChange={(e) => { handleUploadFiles(e.target.files); e.target.value = ""; }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap" }}>
            <ToolbarBtn
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>}
              active={totalMediaCount > 0}
              label={totalMediaCount > 0 ? `${totalMediaCount}` : undefined}
              onClick={() => setVaultOpen(true)}
            />
            <ToolbarBtn
              icon={<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>}
              active={false}
              label={undefined}
              onClick={() => fileInputRef.current?.click()}
            />
            <ToolbarBtn
              icon={<Lock size={19} strokeWidth={1.8} />}
              active={isPPV}
              onClick={() => setIsPPV((v) => !v)}
            />
            <ToolbarBtn
              icon={<Calendar size={19} strokeWidth={1.8} />}
              active={!!scheduledFor}
              onClick={() => setScheduleOpen(true)}
            />
          </div>

          {error && (
            <div style={{ padding: "10px 14px", borderRadius: "10px", backgroundColor: "rgba(239,68,68,0.08)", color: "#EF4444", fontSize: "13px" }}>
              {error}
            </div>
          )}
        </div>
        </div>
      </div>

      {/* ── Vault picker ──────────────────────────────────────────────────── */}
      <VaultPicker
        open={vaultOpen}
        onClose={() => setVaultOpen(false)}
        onConfirm={(items) => {
          console.log("[VaultPicker] confirmed items:", items.map((i) => ({ id: Number(i.id), media_type: i.media_type, thumbnail_url: i.thumbnail_url, bunny_video_id: i.bunny_video_id })));
          setSelected((prev) => mergeUnique(prev, items));
        }}
      />

      {/* ── Audience sheet ────────────────────────────────────────────────── */}
      {audienceOpen && (
        <AudienceSheet
          value={segment}
          excludeActiveChatters={excludeActiveChatters}
          onChange={(seg) => setSegment(seg)}
          onToggleExclude={() => setExcludeActiveChatters((v) => !v)}
          onClose={() => setAudienceOpen(false)}
        />
      )}

      {/* ── Schedule sheet ────────────────────────────────────────────────── */}
      {scheduleOpen && (
        <ScheduleSheet
          value={scheduledFor}
          onChange={(d) => setScheduledFor(d)}
          onClose={() => setScheduleOpen(false)}
        />
      )}
    </>
  );
}