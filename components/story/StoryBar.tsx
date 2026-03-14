"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus, AlertCircle, X } from "lucide-react";
import * as tus from "tus-js-client";
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
const VIEWED_KEY  = "sb_viewed_story_ids";

function getLocalViewed(): Set<number> {
  try { return new Set(JSON.parse(sessionStorage.getItem(VIEWED_KEY) ?? "[]")); } catch { return new Set(); }
}
export function addLocalViewed(id: number) {
  try {
    const s = getLocalViewed(); s.add(id);
    sessionStorage.setItem(VIEWED_KEY, JSON.stringify([...s]));
  } catch {}
}
function applyLocalViewed(groups: CreatorStoryGroup[]): CreatorStoryGroup[] {
  const viewed = getLocalViewed();
  if (viewed.size === 0) return groups;
  return groups.map((g) => {
    const items = g.items.map((s) => viewed.has(s.id) ? { ...s, viewed: true } : s);
    const hasUnviewed = items.some((s) => !s.viewed && !s.isProcessing);
    return { ...g, items, hasUnviewed };
  });
}

function allProcessing(group: CreatorStoryGroup): boolean {
  return group.items.length > 0 && group.items.every((s) => s.isProcessing);
}

export function StoryBar({ onOpenViewer, externalGroups }: StoryBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { viewer: globalViewer, storyUpload, setStoryUpload, resetStoryUpload } = useAppStore();
  const { phase: uploadPhase, uploadPct, error: uploadError, storyId: currentStoryId } = storyUpload;

  const [orderedGroups, setOrderedGroups] = useState<CreatorStoryGroup[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [uploadOpen,    setUploadOpen]    = useState(false);

  const cancelledRef    = useRef(false);
  const isCancellingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [displayPctState, setDisplayPctState] = useState(0);
  const displayPctRef  = useRef(0);
  const targetPctRef   = useRef(0);
  const rafRef         = useRef<number | null>(null);
  const { compressPct } = storyUpload;

  useEffect(() => {
    if (uploadPhase === "idle" || uploadPhase === "done") {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      displayPctRef.current = uploadPhase === "done" ? 100 : 0;
      setDisplayPctState(displayPctRef.current);
      targetPctRef.current = displayPctRef.current;
      return;
    }

    if      (uploadPhase === "compressing") targetPctRef.current = 20;
    else if (uploadPhase === "uploading")   targetPctRef.current = 55;
    else if (uploadPhase === "processing")  targetPctRef.current = 99;

    const tick = () => {
      const current = displayPctRef.current;
      const target  = targetPctRef.current;
      const diff    = target - current;
      if (Math.abs(diff) < 0.2) {
        displayPctRef.current = target;
      } else {
        displayPctRef.current = current + diff * 0.04;
      }
      setDisplayPctState(Math.round(displayPctRef.current));
      rafRef.current = requestAnimationFrame(tick);
    };

    if (!rafRef.current) rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } };
  }, [uploadPhase]);

  useEffect(() => {
    if (uploadPhase === "compressing" && compressPct > 0) {
      targetPctRef.current = Math.min(20, (compressPct / 100) * 20);
    }
  }, [uploadPhase, compressPct]);

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
        const fetchedGroups: CreatorStoryGroup[] = applyLocalViewed(data.groups);
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
          .map((s) => s.mediaUrl)
          .slice(0, 3);

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
    setOrderedGroups((prev) => {
      const externalIds = new Set(externalGroups.map((g) => g.creatorId));
      const kept   = prev.filter((g) => !externalIds.has(g.creatorId));
      const active = externalGroups.filter((g) => g.items.length > 0);
      return sortGroups([...kept, ...active]);
    });
  }, [externalGroups, sortGroups]);

  useEffect(() => {
    if (!isCreator || !globalViewer?.id) return;

    const supabase = createClient();
    const channel  = supabase
      .channel(`story-bar-${globalViewer.id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "stories", filter: `creator_id=eq.${globalViewer.id}` },
        () => { fetchStories(); },
      )
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "stories", filter: `creator_id=eq.${globalViewer.id}` },
        (payload: { new: Record<string, any>; old: Record<string, any> }) => {
          fetchStories();
          if (payload.new?.is_processing === false && payload.old?.is_processing === true) {
            const currentPhase = useAppStore.getState().storyUpload.phase;
            if (currentPhase === "processing") {
              targetPctRef.current = 100;
              setStoryUpload({ phase: "done" });
              setTimeout(() => resetStoryUpload(), 2000);
            }
          }
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isCreator, globalViewer?.id, fetchStories, setStoryUpload, resetStoryUpload]);

  useEffect(() => {
    if (uploadPhase !== "processing" || !currentStoryId) return;
    const interval = setInterval(async () => {
      try {
        const res  = await fetch(`/api/stories/${currentStoryId}/status`);
        const data = await res.json();
        if (res.ok && data.isProcessing === false) {
          clearInterval(interval);
          await fetchStories();
          targetPctRef.current = 100;
          setStoryUpload({ phase: "done" });
          setTimeout(() => resetStoryUpload(), 2000);
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [uploadPhase, currentStoryId, fetchStories, setStoryUpload, resetStoryUpload]);

  const cancelUpload = useCallback(async () => {
    if (isCancellingRef.current) return;
    isCancellingRef.current = true;
    cancelledRef.current    = true;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    resetStoryUpload();
    isCancellingRef.current = false;
  }, [resetStoryUpload]);

  const startUpload = useCallback(async (job: UploadJob) => {
    cancelledRef.current = false;
    resetStoryUpload();

    try {
      let fileToUpload = job.file;

      if (job.mediaType === "video") {
        setStoryUpload({ phase: "compressing" });
        fileToUpload = await compressVideoIfNeeded(job.file, (p) => {
          setStoryUpload({ compressPct: p.percent });
        });
        if (cancelledRef.current) return;
      }

      setStoryUpload({ phase: "uploading", uploadPct: 0 });

      // ── PHOTO — FormData, streams directly, no base64 ─────────────────
      if (job.mediaType === "photo") {
        const formData = new FormData();
        formData.append("file",      fileToUpload);
        formData.append("mediaType", "photo");
        if (job.caption) formData.append("caption", job.caption);

        setStoryUpload({ uploadPct: 30 });

        const controller = new AbortController();
        abortControllerRef.current = controller;
        const timer = setTimeout(() => controller.abort(), 120000);

        let initRes: Response;
        try {
          initRes = await fetch("/api/stories/init", {
            method: "POST",
            body:   formData,
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timer);
          abortControllerRef.current = null;
        }

        if (cancelledRef.current) return;

        const initData = await initRes.json();
        if (!initRes.ok) throw new Error(initData.error ?? "Upload failed");

        setStoryUpload({ phase: "done", uploadPct: 100 });
        await fetchStories();
        setTimeout(() => resetStoryUpload(), 2000);
        return;
      }

      // ── VIDEO — get TUS credentials, upload directly to Bunny ─────────
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const timer = setTimeout(() => controller.abort(), 30000);

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

      await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(fileToUpload, {
          endpoint:    tusEndpoint,
          chunkSize:   5 * 1024 * 1024,
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
            const pct = Math.round((bytesUploaded / bytesTotal) * 75) + 20;
            setStoryUpload({ uploadPct: pct });
          },
          onSuccess() { resolve(); },
          onError(err)  { reject(new Error(`TUS upload failed: ${err.message}`)); },
        });
        upload.start();
      });

      if (cancelledRef.current) return;

      setStoryUpload({ phase: "processing", storyId, uploadPct: 100 });
      await fetchStories();

    } catch (err: any) {
      if (cancelledRef.current) return;
      const msg = err?.name === "AbortError"
        ? "Upload timed out — please try again"
        : (err.message ?? "Upload failed");
      setStoryUpload({ phase: "idle", error: msg });
    }
  }, [fetchStories, setStoryUpload, resetStoryUpload]);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "right" ? 220 : -220, behavior: "smooth" });
  };

  const ownGroup = isCreator && globalViewer
    ? orderedGroups.find((g) => g.creatorId === globalViewer.id) ?? null
    : null;

  const otherGroups = orderedGroups.filter(
    (g) => g.creatorId !== globalViewer?.id && !allProcessing(g)
  );

  const displayGroups: CreatorStoryGroup[] = otherGroups;

  const handleOpenOwnStories = useCallback(() => {
    if (!ownGroup || isUploading) return;
    const viewable = { ...ownGroup, items: ownGroup.items.filter((s) => !s.isProcessing) };
    if (viewable.items.length === 0) return;
    onOpenViewer?.([viewable], 0);
  }, [ownGroup, isUploading, onOpenViewer]);

  const handleOpenStory = useCallback((groupIndex: number) => {
    const clickedCreatorId = displayGroups[groupIndex]?.creatorId;
    if (!clickedCreatorId) return;

    const viewableGroups = displayGroups
      .map((g) => ({ ...g, items: g.items.filter((s) => !s.isProcessing) }))
      .filter((g) => g.items.length > 0);

    const viewableIndex = viewableGroups.findIndex((g) => g.creatorId === clickedCreatorId);
    if (viewableIndex === -1) return;
    if (viewableGroups[viewableIndex].items.length === 0) return;

    onOpenViewer?.(viewableGroups, viewableIndex);
  }, [displayGroups, onOpenViewer]);

  const openUpload = useCallback(() => {
    if (isUploading) return;
    setStoryUpload({ error: null });
    setUploadOpen(true);
  }, [isUploading, setStoryUpload]);

  const displayPct = displayPctState;

  const ownThumbnail  = ownGroup?.latestThumbnail ?? null;
  const hasOwnStories = (ownGroup?.items.filter((s) => !s.isProcessing).length ?? 0) > 0;

  if (!loading && !isCreator && displayGroups.length === 0) return null;

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
        .sb-own-circle { cursor:pointer; transition:opacity 0.15s; }
        .sb-own-circle:hover { opacity:0.88; }
        .sb-plus-btn { transition:transform 0.15s; }
        .sb-plus-btn:hover { transform:scale(1.12); }
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
          {isCreator && globalViewer && (
            <div
              className="sb-item"
              style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, flexShrink:0 }}
            >
              <div style={{ position: "relative" }}>
                <div
                  className={!isUploading && hasOwnStories ? "sb-own-circle" : undefined}
                  onClick={!isUploading && hasOwnStories ? handleOpenOwnStories : undefined}
                  style={{
                    padding:      "2.5px",
                    borderRadius: "50%",
                    background:   isUploading ? "transparent" : hasOwnStories ? GRADIENT : "#2A2A3D",
                    border:       isUploading || hasOwnStories ? "none" : "2px dashed #4A4A6A",
                    boxShadow:    !isUploading && hasOwnStories ? GLOW : "none",
                  }}
                >
                  <div style={{ padding: "2.5px", borderRadius: "50%", backgroundColor: "#0A0A0F", position: "relative", overflow: "hidden" }}>
                    {isUploading ? (
                      <Avatar src={globalViewer.avatar_url ?? null} name={globalViewer.display_name || globalViewer.username || "?"} size={80} />
                    ) : hasOwnStories && ownThumbnail ? (
                      <ThumbnailWithFallback src={ownThumbnail} name={globalViewer.display_name || globalViewer.username || "?"} avatarUrl={globalViewer.avatar_url ?? null} size={80} />
                    ) : (
                      <Avatar src={globalViewer.avatar_url ?? null} name={globalViewer.display_name || globalViewer.username || "?"} size={80} />
                    )}
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

                {!isUploading && (
                  <button
                    className="sb-plus-btn"
                    onClick={(e) => { e.stopPropagation(); openUpload(); }}
                    style={{ position:"absolute", bottom:0, right:0, width:24, height:24, borderRadius:"50%", background:GRADIENT, border:"2px solid #0A0A0F", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", padding:0, zIndex:4 }}
                  >
                    <Plus size={12} color="#fff" strokeWidth={2.5} />
                  </button>
                )}

                {uploadError && !isUploading && (
                  <button
                    title={uploadError}
                    onClick={(e) => { e.stopPropagation(); setStoryUpload({ error: null }); setUploadOpen(true); }}
                    style={{ position:"absolute", bottom:0, right:0, width:22, height:22, borderRadius:"50%", background:"#EF4444", border:"2px solid #0A0A0F", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", padding:0, zIndex:4 }}
                  >
                    <AlertCircle size={12} color="#fff" />
                  </button>
                )}
              </div>

              <button
                onClick={isUploading ? cancelUpload : openUpload}
                style={{ background:"none", border:"none", cursor:"pointer", padding:"2px 4px", fontSize:12, fontWeight:700, color: isUploading ? "#EF4444" : uploadError ? "#EF4444" : "#C084FC", maxWidth:80, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", textAlign:"center", fontFamily:"'Inter',sans-serif", textShadow:"0 1px 4px rgba(0,0,0,0.8)" }}
              >
                {isUploading ? "Cancel" : "Add to story"}
              </button>
            </div>
          )}

          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, flexShrink:0 }}>
                  <div style={{ width:88, height:88, borderRadius:"50%", backgroundColor:"#1C1C2E" }} />
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
                          <ThumbnailWithFallback src={group.latestThumbnail} name={group.displayName} avatarUrl={group.avatarUrl} size={80} />
                        ) : (
                          <Avatar src={group.avatarUrl} name={group.displayName} size={80} />
                        )}
                      </div>
                    </div>
                    <span
                      className="sb-label"
                      style={{ fontSize:12, fontWeight:700, color: isViewed ? "#888899" : "#FFFFFF", maxWidth:80, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", textAlign:"center", transition:"color 0.4s ease", fontFamily:"'Inter',sans-serif", textShadow: isViewed ? "none" : "0 1px 4px rgba(0,0,0,0.8)" }}
                    >
                      {group.username}
                    </span>
                  </div>
                );
              })
          }
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