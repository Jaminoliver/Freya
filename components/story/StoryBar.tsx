"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus, AlertCircle, X } from "lucide-react";
import { useAppStore } from "@/lib/store/appStore";
import StoryUploadModal, { type UploadJob } from "@/components/story/StoryUploadModal";
import { compressVideoIfNeeded } from "@/lib/utils/compressVideo";
import { prewarmHls } from "@/components/story/StoryViewer";
import { createClient } from "@/lib/supabase/client";

export interface StoryItem {
  id:           number;
  mediaUrl:     string;
  mediaType:    "photo" | "video";
  thumbnailUrl: string | null;
  caption:      string | null;
  createdAt:    string;
  expiresAt:    string;
  viewed:       boolean;
  isProcessing?: boolean;
}

export interface CreatorStoryGroup {
  creatorId:       string;
  username:        string;
  displayName:     string;
  avatarUrl:       string | null;
  hasUnviewed:     boolean;
  latestStoryAt:   string;
  latestThumbnail: string | null;
  items:           StoryItem[];
}

interface StoryBarProps {
  onOpenViewer?:   (groups: CreatorStoryGroup[], startIndex: number) => void;
  externalGroups?: CreatorStoryGroup[];
}

function Avatar({ src, name, size = 64 }: { src: string | null; name: string; size?: number }) {
  const colors = ["#8B5CF6","#EC4899","#F59E0B","#10B981","#3B82F6","#EF4444","#06B6D4","#84CC16"];
  const bg     = colors[(name.charCodeAt(0) ?? 0) % colors.length];
  const letter = (name[0] ?? "?").toUpperCase();
  if (src) {
    return (
      <img src={src} alt={name} width={size} height={size}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", display: "block" }}
      />
    );
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
      <circle cx={size / 2} cy={size / 2} r={size / 2} fill={bg} />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle"
        fill="#fff" fontSize={size * 0.38} fontFamily="Inter,sans-serif" fontWeight="700">
        {letter}
      </text>
    </svg>
  );
}

const GRADIENT    = "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)";
const GLOW        = "0 0 12px rgba(139,92,246,0.55), 0 0 24px rgba(236,72,153,0.35)";
const VIEWED_RING = "#2A2A3D";

// Maps all upload phases to a single unified 0-100 percentage so the creator
// sees one continuous number from tap-send to story-ready.
function overallPct(phase: string, uploadPct: number, compressPct: number): number {
  switch (phase) {
    case "compressing": return Math.round((compressPct / 100) * 25);
    case "init":        return 27;
    case "uploading":   return 30 + Math.round((uploadPct  / 100) * 50);
    case "completing":  return 82;
    case "processing":  return 0; // handled via fake ticker in component
    case "done":        return 100;
    default:            return 0;
  }
}

// Returns true if a group should be hidden from the bar.
// A group is hidden when every one of its items is still processing
// (Bunny hasn't finished transcoding — thumbnail would 404).
function allProcessing(group: CreatorStoryGroup): boolean {
  return group.items.length > 0 && group.items.every((s) => s.isProcessing);
}

export function StoryBar({ onOpenViewer, externalGroups }: StoryBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { viewer: globalViewer, storyUpload, setStoryUpload, resetStoryUpload } = useAppStore();
  const { phase: uploadPhase, uploadPct, compressPct, error: uploadError, storyId: currentStoryId } = storyUpload;

  const [orderedGroups, setOrderedGroups] = useState<CreatorStoryGroup[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [uploadOpen,    setUploadOpen]    = useState(false);

  const [fakePct, setFakePct] = useState(0);
  const fakePctRef   = useRef(0);
  const fakeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tusUploadRef    = useRef<any>(null);
  const cancelledRef    = useRef(false);
  const isCancellingRef = useRef(false);

  // Drive a slow fake ticker during "processing" phase (85→99%).
  useEffect(() => {
    if (uploadPhase === "processing") {
      fakePctRef.current = 85;
      setFakePct(85);
      fakeTimerRef.current = setInterval(() => {
        const next = Math.min(fakePctRef.current + 1, 99);
        fakePctRef.current = next;
        setFakePct(next);
        if (next >= 99 && fakeTimerRef.current) {
          clearInterval(fakeTimerRef.current);
          fakeTimerRef.current = null;
        }
      }, 1400);
    } else {
      if (fakeTimerRef.current) { clearInterval(fakeTimerRef.current); fakeTimerRef.current = null; }
      if (uploadPhase === "idle" || uploadPhase === "done") { fakePctRef.current = 0; setFakePct(0); }
    }
    return () => { if (fakeTimerRef.current) { clearInterval(fakeTimerRef.current); fakeTimerRef.current = null; } };
  }, [uploadPhase]);

  const isUploading = uploadPhase !== "idle" && uploadPhase !== "done";
  const isCreator   = globalViewer?.role === "creator";

  const sortGroups = useCallback((fetchedGroups: CreatorStoryGroup[]): CreatorStoryGroup[] => {
    const unviewed = fetchedGroups.filter((g) =>  g.hasUnviewed).sort((a, b) => b.latestStoryAt.localeCompare(a.latestStoryAt));
    const viewed   = fetchedGroups.filter((g) => !g.hasUnviewed).sort((a, b) => b.latestStoryAt.localeCompare(a.latestStoryAt));
    return [...unviewed, ...viewed];
  }, []);

  const fetchStories = useCallback(async () => {
    try {
      const res  = await fetch("/api/stories");
      const data = await res.json();
      if (res.ok && data.groups) {
        const fetchedGroups: CreatorStoryGroup[] = data.groups;
        setOrderedGroups(sortGroups(fetchedGroups));

        for (const g of fetchedGroups) {
          if (g.latestThumbnail) { const img = new Image(); img.src = g.latestThumbnail; }
          if (g.avatarUrl)       { const img = new Image(); img.src = g.avatarUrl; }
          for (const s of g.items) {
            if (s.mediaType === "photo" && s.mediaUrl) { const img = new Image(); img.src = s.mediaUrl; }
            if (s.thumbnailUrl) { const t = new Image(); t.src = s.thumbnailUrl; }
          }
        }

        const videoUrls = fetchedGroups
          .flatMap((g) => g.items)
          .filter((s) => s.mediaType === "video" && s.mediaUrl && !s.isProcessing)
          .map((s) => s.mediaUrl);

        if (videoUrls.length > 0) prewarmHls(videoUrls);
      }
    } catch (err) {
      console.error("[StoryBar] fetch stories error:", err);
    } finally {
      setLoading(false);
    }
  }, [sortGroups]);

  useEffect(() => { fetchStories(); }, [fetchStories]);

  useEffect(() => {
    if (!externalGroups || externalGroups.length === 0) return;
    setOrderedGroups(sortGroups(externalGroups));
  }, [externalGroups, sortGroups]);

  // Fallback poller — if Realtime WebSocket drops during "processing" phase,
  // poll every 4s until is_processing flips to false on the current story.
  useEffect(() => {
    if (uploadPhase !== "processing" || !currentStoryId) return;
    const interval = setInterval(async () => {
      try {
        const res  = await fetch(`/api/stories/${currentStoryId}/status`);
        const data = await res.json();
        if (res.ok && data.isProcessing === false) {
          clearInterval(interval);
          fetchStories();
          setStoryUpload({ phase: "done" });
          setTimeout(() => resetStoryUpload(), 2000);
        }
      } catch {}
    }, 4000);
    return () => clearInterval(interval);
  }, [uploadPhase, currentStoryId, fetchStories, setStoryUpload, resetStoryUpload]);

  // Realtime: re-fetch on INSERT or UPDATE for the creator's own stories.
  // Merged into a single channel to avoid duplicate subscriptions.
  useEffect(() => {
    if (!isCreator || !globalViewer?.id) return;

    const supabase = createClient();
    const channel  = supabase
      .channel(`story-bar-${globalViewer.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "stories", filter: `creator_id=eq.${globalViewer.id}` },
        () => { fetchStories(); },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "stories", filter: `creator_id=eq.${globalViewer.id}` },
        (payload: { new: Record<string, any>; old: Record<string, any> }) => {
          if (payload.new?.is_processing === false && payload.old?.is_processing === true) {
            fetchStories();
            const currentPhase = useAppStore.getState().storyUpload.phase;
            if (currentPhase === "processing") {
              setStoryUpload({ phase: "done" });
              setTimeout(() => resetStoryUpload(), 2000);
            }
          }
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isCreator, globalViewer?.id, fetchStories, setStoryUpload, resetStoryUpload]);

  // ── Cancel ────────────────────────────────────────────────────────────────
  const cancelUpload = useCallback(async () => {
    if (isCancellingRef.current) return;
    isCancellingRef.current = true;
    cancelledRef.current    = true;

    if (tusUploadRef.current) {
      try { tusUploadRef.current.abort(); } catch {}
      tusUploadRef.current = null;
    }

    if (currentStoryId) {
      try {
        await fetch("/api/stories/cancel", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ storyId: currentStoryId }),
        });
      } catch {}
    }

    resetStoryUpload();
    isCancellingRef.current = false;
  }, [currentStoryId, resetStoryUpload]);

  // ── Start upload ──────────────────────────────────────────────────────────
  const startUpload = useCallback(async (job: UploadJob) => {
    cancelledRef.current = false;
    resetStoryUpload();

    const startTime = Date.now();
    console.log(`[story-upload] ── START ──────────────────────────────────`);

    try {
      let fileToUpload = job.file;

      if (job.mediaType === "video") {
        setStoryUpload({ phase: "compressing" });
        fileToUpload = await compressVideoIfNeeded(job.file, (p) => {
          setStoryUpload({ compressPct: p.percent });
          console.log(`[story-upload] Compression: ${p.message}`);
        });
        if (cancelledRef.current) return;
        console.log(`[story-upload] Compression done | New size: ${(fileToUpload.size / 1024 / 1024).toFixed(2)} MB`);
      }

      setStoryUpload({ phase: "init", compressPct: 0 });

      const initBody: Record<string, unknown> = {
        mediaType: job.mediaType,
        caption:   job.caption,
        clipStart: job.clipStart,
        clipEnd:   job.clipEnd,
        fileName:  fileToUpload.name,
        mimeType:  fileToUpload.type,
      };

      if (job.mediaType === "photo") {
        const base64 = await new Promise<string>((res, rej) => {
          const reader = new FileReader();
          reader.onload  = () => res((reader.result as string).split(",")[1]);
          reader.onerror = rej;
          reader.readAsDataURL(fileToUpload);
        });
        initBody.fileData = base64;
      }

      if (cancelledRef.current) return;

      const initController = new AbortController();
      const initTimer      = setTimeout(() => initController.abort(), 15000);
      let   initRes: Response;
      try {
        initRes = await fetch("/api/stories/init", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(initBody),
          signal:  initController.signal,
        });
      } finally {
        clearTimeout(initTimer);
      }

      const initData = await initRes.json();
      if (!initRes.ok) throw new Error(initData.error ?? "Init failed");
      if (cancelledRef.current) return;

      if (initData.storyId) setStoryUpload({ storyId: initData.storyId });

      if (initData.uploadType === "done") {
        setStoryUpload({ phase: "done" });
        await fetchStories();
        setTimeout(() => resetStoryUpload(), 2000);
        return;
      }

      setStoryUpload({ phase: "uploading", uploadPct: 0 });
      const { storyId, tusEndpoint, videoId, signature, expireTime, libraryId } = initData;
      if (storyId) setStoryUpload({ storyId });

      const tusStart      = Date.now();
      let   lastLoggedPct = -1;

      await new Promise<void>((resolve, reject) => {
        import("tus-js-client").then(({ Upload }) => {
          if (cancelledRef.current) { resolve(); return; }

          const upload = new Upload(fileToUpload, {
            endpoint:    tusEndpoint,
            chunkSize:   5 * 1024 * 1024,
            retryDelays: [0, 3000, 5000, 10000, 20000],
            headers: {
              AuthorizationSignature: signature,
              AuthorizationExpire:    String(expireTime),
              VideoId:                videoId,
              LibraryId:              libraryId,
            },
            metadata: { filetype: fileToUpload.type, title: `story-${videoId}` },
            onChunkComplete(_chunkSize, bytesAccepted, bytesTotal) {
              if (cancelledRef.current) return;
              const pct = Math.round((bytesAccepted / bytesTotal) * 100);
              setStoryUpload({ uploadPct: pct });
              if (pct >= lastLoggedPct + 10) {
                const elapsed  = (Date.now() - tusStart) / 1000;
                const speedMBs = (bytesAccepted / 1024 / 1024 / elapsed).toFixed(2);
                const remainMB = ((bytesTotal - bytesAccepted) / 1024 / 1024).toFixed(1);
                console.log(`[story-upload] TUS ${pct}% | ${speedMBs} MB/s | ~${remainMB} MB left`);
                lastLoggedPct = pct;
              }
            },
            onError(err) {
              if (cancelledRef.current) { resolve(); return; }
              reject(err);
            },
            onSuccess() {
              console.log(`[story-upload] TUS done in ${((Date.now() - tusStart) / 1000).toFixed(1)}s`);
              resolve();
            },
          });

          tusUploadRef.current = upload;
          upload.start();
        }).catch(reject);
      });

      if (cancelledRef.current) return;
      tusUploadRef.current = null;

      setStoryUpload({ phase: "completing" });

      const completeController = new AbortController();
      const completeTimer      = setTimeout(() => completeController.abort(), 10000);
      try {
        const completeRes = await fetch("/api/stories/complete", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ storyId }),
          signal:  completeController.signal,
        });
        if (!completeRes.ok) throw new Error("Failed to complete story");
      } finally {
        clearTimeout(completeTimer);
      }

      if (cancelledRef.current) return;

      console.log(`[story-upload] ── UPLOAD DONE ✓ Total: ${((Date.now() - startTime) / 1000).toFixed(1)}s — waiting for Bunny transcoding`);
      setStoryUpload({ phase: "processing", uploadPct: 0 });
      await fetchStories();

    } catch (err: any) {
      if (cancelledRef.current) return;
      const msg = err?.name === "AbortError"
        ? "Upload timed out — please try again"
        : (err.message ?? "Upload failed");
      console.error(`[story-upload] ── FAILED: ${msg}`, err);
      setStoryUpload({ phase: "idle", error: msg });
    }
  }, [fetchStories, setStoryUpload, resetStoryUpload]);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "right" ? 220 : -220, behavior: "smooth" });
  };

  const handleOpenStory = (groupIndex: number) => {
    const clickedCreatorId = displayGroups[groupIndex]?.creatorId;
    if (!clickedCreatorId) return;

    // Strip processing items from each group, but keep groups that have
    // at least one ready item — OR the creator's own group (always openable).
    const viewableGroups = displayGroups
      .map((g) => ({ ...g, items: g.items.filter((s) => !s.isProcessing) }))
      .filter((g) => g.items.length > 0 || g.creatorId === clickedCreatorId);

    // Remove empty groups except the clicked one (creator with all-processing items)
    const filtered = viewableGroups.filter(
      (g) => g.items.length > 0 || g.creatorId === clickedCreatorId
    );

    const viewableIndex = filtered.findIndex((g) => g.creatorId === clickedCreatorId);
    if (viewableIndex === -1) return;

    // Don't open viewer if the clicked group has no viewable items
    if (filtered[viewableIndex].items.length === 0) return;

    onOpenViewer?.(filtered, viewableIndex);
  };

  // ── Derive display list ───────────────────────────────────────────────────
  // 1. Pin creator's own group at position 0 (always shown even while processing)
  // 2. Other groups hidden until transcoding finishes (no broken thumbnails for fans)
  const ownGroup    = isCreator && globalViewer
    ? orderedGroups.find((g) => g.creatorId === globalViewer.id) ?? null
    : null;
  const otherGroups = orderedGroups.filter((g) => !allProcessing(g) && g.creatorId !== globalViewer?.id);
  const displayGroups: CreatorStoryGroup[] = [
    ...(ownGroup ? [ownGroup] : []),
    ...otherGroups,
  ];

  const displayPct = uploadPhase === "processing"
    ? fakePct
    : overallPct(uploadPhase, uploadPct, compressPct);

  const statusLabel = isUploading
    ? `${displayPct}%`
    : uploadError
      ? "Failed"
      : uploadPhase === "done"
        ? "Posted ✓"
        : "Your Story";

  return (
    <>
      <style>{`
        .sb-arrow { display:flex; }
        @media (max-width:767px) { .sb-arrow { display:none !important; } }
        .sb-scroll { padding:4px 36px; }
        @media (max-width:767px) { .sb-scroll { padding:4px 0; } }
        .sb-item:hover .sb-label { color:#fff; }
        @keyframes sb-pulse {
          0%,100% { box-shadow:${GLOW}; }
          50%      { box-shadow:0 0 20px rgba(139,92,246,0.8),0 0 40px rgba(236,72,153,0.5); }
        }
        @keyframes sb-spin { to { transform:rotate(360deg); } }
        .sb-upload-overlay { background: rgba(0,0,0,0.5); transition: background 0.15s; }
        .sb-upload-overlay:hover { background: rgba(0,0,0,0.7); }
        .sb-upload-overlay:hover .sb-upload-pct { display:none; }
        .sb-upload-overlay:hover .sb-upload-x { display:flex !important; }
      `}</style>

      {uploadOpen && (
        <StoryUploadModal
          onClose={() => setUploadOpen(false)}
          onUploadStart={(job) => { setUploadOpen(false); startUpload(job); }}
        />
      )}

      <div style={{ position: "relative", padding: "14px 0 10px" }}>

        <button
          className="sb-arrow"
          onClick={() => scroll("left")}
          style={{ position:"absolute", left:0, top:"50%", transform:"translateY(-50%)", zIndex:2, width:28, height:28, borderRadius:"50%", border:"1px solid #2A2A3D", backgroundColor:"rgba(13,13,24,0.9)", backdropFilter:"blur(8px)", color:"#A3A3C2", alignItems:"center", justifyContent:"center", cursor:"pointer", transition:"all 0.15s" }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor="#1C1C2E"; e.currentTarget.style.color="#fff"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor="rgba(13,13,24,0.9)"; e.currentTarget.style.color="#A3A3C2"; }}
        >
          <ChevronLeft size={15} />
        </button>

        <div
          ref={scrollRef}
          className="sb-scroll"
          style={{ display:"flex", gap:16, overflowX:"auto", scrollbarWidth:"none", msOverflowStyle:"none" }}
        >
          {/* ── Add Story button (creator only) ── */}
          {isCreator && globalViewer && (
            <div
              className="sb-item"
              onClick={() => { if (!isUploading) { setStoryUpload({ error: null }); setUploadOpen(true); } }}
              style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, flexShrink:0, cursor: isUploading ? "default" : "pointer" }}
            >
              <div style={{ position: "relative" }}>
                <div style={{
                  padding:      "2.5px",
                  borderRadius: "50%",
                  background:   isUploading ? "transparent" : "#2A2A3D",
                  border:       isUploading ? "none" : "2px dashed #4A4A6A",
                }}>
                  <div style={{ padding: "2.5px", borderRadius: "50%", backgroundColor: "#0A0A0F" }}>
                    <Avatar
                      src={globalViewer.avatar_url ?? null}
                      name={globalViewer.display_name || globalViewer.username || "?"}
                      size={80}
                    />
                  </div>
                </div>

                {isUploading && (
                  <div style={{ position:"absolute", inset:-1, borderRadius:"50%", border:"3px solid transparent", borderTop:"3px solid #8B5CF6", borderRight:"3px solid #EC4899", animation:"sb-spin 0.9s linear infinite", pointerEvents:"none" }} />
                )}

                {isUploading && (
                  <div
                    className="sb-upload-overlay"
                    onClick={(e) => { e.stopPropagation(); cancelUpload(); }}
                    style={{ position:"absolute", inset:0, borderRadius:"50%", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", zIndex:3 }}
                  >
                    <span className="sb-upload-pct" style={{ color:"#fff", fontSize:16, fontWeight:700, fontFamily:"'Inter',sans-serif", pointerEvents:"none" }}>
                      {`${displayPct}%`}
                    </span>
                    <span className="sb-upload-x" style={{ color:"#fff", pointerEvents:"none", display:"none" }}>
                      <X size={20} strokeWidth={2.5} />
                    </span>
                  </div>
                )}

                {!isUploading && uploadPhase !== "done" && !uploadError && (
                  <div style={{ position:"absolute", bottom:0, right:0, width:22, height:22, borderRadius:"50%", background:GRADIENT, border:"2px solid #0A0A0F", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <Plus size={12} color="#fff" strokeWidth={2.5} />
                  </div>
                )}
                {uploadError && !isUploading && (
                  <div
                    title={uploadError}
                    onClick={(e) => { e.stopPropagation(); setStoryUpload({ error: null }); setUploadOpen(true); }}
                    style={{ position:"absolute", bottom:0, right:0, width:22, height:22, borderRadius:"50%", background:"#EF4444", border:"2px solid #0A0A0F", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}
                  >
                    <AlertCircle size={12} color="#fff" />
                  </div>
                )}
              </div>
              {isUploading && (
                <button
                  onClick={(e) => { e.stopPropagation(); cancelUpload(); }}
                  style={{ marginTop:2, background:"none", border:"none", cursor:"pointer", fontSize:11, fontWeight:600, color:"#EF4444", fontFamily:"'Inter',sans-serif", padding:"2px 8px" }}
                >
                  Cancel
                </button>
              )}
              {!isUploading && (
                <span
                  className="sb-label"
                  style={{ fontSize:12, fontWeight:700, color: uploadPhase === "done" ? "#10B981" : "#FFFFFF", maxWidth:80, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", textAlign:"center", transition:"color 0.2s", fontFamily:"'Inter',sans-serif", textShadow:"0 1px 4px rgba(0,0,0,0.8)" }}
                >
                  {statusLabel}
                </span>
              )}
            </div>
          )}

          {/* ── Story groups ── */}
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, flexShrink:0 }}>
                  <div style={{ width:88, height:88, borderRadius:"50%", backgroundColor:"#1C1C2E", animation:"sb-pulse 1.8s ease-in-out infinite" }} />
                  <div style={{ width:44, height:10, borderRadius:4, backgroundColor:"#1C1C2E" }} />
                </div>
              ))
            : displayGroups.map((group, idx) => {
                const isViewed = !group.hasUnviewed;
                return (
                  <div
                    key={group.creatorId}
                    className="sb-item"
                    onClick={() => handleOpenStory(idx)}
                    style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, flexShrink:0, cursor:"pointer" }}
                  >
                    <div style={{ padding:"2.5px", borderRadius:"50%", background: isViewed ? VIEWED_RING : GRADIENT, boxShadow: isViewed ? "none" : GLOW, animation: isViewed ? "none" : "sb-pulse 3s ease-in-out infinite", transition:"all 0.4s ease" }}>
                      <div style={{ padding:"2.5px", borderRadius:"50%", backgroundColor:"#0A0A0F", position:"relative", overflow:"hidden" }}>
                        {group.latestThumbnail ? (
                          <ThumbnailWithFallback
                            src={group.latestThumbnail}
                            name={group.displayName}
                            avatarUrl={group.avatarUrl}
                            size={80}
                          />
                        ) : (
                          <Avatar src={group.avatarUrl} name={group.displayName} size={80} />
                        )}
                      </div>
                    </div>
                    <span
                      className="sb-label"
                      style={{
                        fontSize:     12,
                        fontWeight:   700,
                        color:        isViewed ? "#888899" : "#FFFFFF",
                        maxWidth:     80,
                        overflow:     "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace:   "nowrap",
                        textAlign:    "center",
                        transition:   "color 0.4s ease",
                        fontFamily:   "'Inter',sans-serif",
                        textShadow:   isViewed ? "none" : "0 1px 4px rgba(0,0,0,0.8)",
                      }}
                    >
                      {group.username}
                    </span>
                  </div>
                );
              })
          }

          {!loading && displayGroups.length === 0 && !isCreator && (
            <div style={{ display:"flex", alignItems:"center", color:"#4A4A6A", fontSize:13, padding:"8px 4px", whiteSpace:"nowrap" }}>
              No stories yet
            </div>
          )}
        </div>

        <button
          className="sb-arrow"
          onClick={() => scroll("right")}
          style={{ position:"absolute", right:0, top:"50%", transform:"translateY(-50%)", zIndex:2, width:28, height:28, borderRadius:"50%", border:"1px solid #2A2A3D", backgroundColor:"rgba(13,13,24,0.9)", backdropFilter:"blur(8px)", color:"#A3A3C2", alignItems:"center", justifyContent:"center", cursor:"pointer", transition:"all 0.15s" }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor="#1C1C2E"; e.currentTarget.style.color="#fff"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor="rgba(13,13,24,0.9)"; e.currentTarget.style.color="#A3A3C2"; }}
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </>
  );
}

function ThumbnailWithFallback({
  src, name, avatarUrl, size,
}: {
  src: string; name: string; avatarUrl: string | null; size: number;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <Avatar src={avatarUrl} name={name} size={size} />;
  return (
    <div style={{ position:"relative", width:size, height:size, borderRadius:"50%", overflow:"hidden" }}>
      <img src={src} alt={name} onError={() => setFailed(true)}
        style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}
      />
    </div>
  );
}

export type { };
export { type StoryBarProps };