"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus, AlertCircle, X } from "lucide-react";
import { useAppStore } from "@/lib/store/appStore";
import StoryUploadModal from "@/components/story/StoryUploadModal";
import { useStoryUpload } from "@/lib/context/StoryUploadContext";
import type { UploadJob } from "@/lib/context/StoryUploadContext";
import { prewarmHls } from "@/components/story/StoryViewer";
import { createClient } from "@/lib/supabase/client";
import { AvatarWithStoryRing } from "@/components/ui/AvatarWithStoryRing";

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

const CARD_W      = 135;
const CARD_H      = 175;
const CARD_RADIUS = 14;
const BORDER      = 2.5;

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

  const { viewer: globalViewer } = useAppStore();

  const {
    phase:       uploadPhase,
    uploadPct,
    compressPct,
    error:       uploadError,
    storyId:     currentStoryId,
    startUpload,
    cancelUpload,
    clearError,
    markProcessingComplete,
  } = useStoryUpload();

  const [orderedGroups, setOrderedGroups] = useState<CreatorStoryGroup[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [uploadOpen,    setUploadOpen]    = useState(false);

  const uploadPhaseRef = useRef(uploadPhase);
  useEffect(() => { uploadPhaseRef.current = uploadPhase; }, [uploadPhase]);

  const [displayPctState, setDisplayPctState] = useState(0);
  const displayPctRef = useRef(0);
  const targetPctRef  = useRef(0);
  const rafRef        = useRef<number | null>(null);

  useEffect(() => {
    if (uploadPhase === "idle" || uploadPhase === "done") {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      displayPctRef.current = uploadPhase === "done" ? 100 : 0;
      setDisplayPctState(displayPctRef.current);
      targetPctRef.current  = displayPctRef.current;
      return;
    }
    if      (uploadPhase === "compressing") targetPctRef.current = 20;
    else if (uploadPhase === "uploading")   targetPctRef.current = 55;
    else if (uploadPhase === "processing")  targetPctRef.current = 99;
    const tick = () => {
      const current = displayPctRef.current;
      const target  = targetPctRef.current;
      const diff    = target - current;
      displayPctRef.current = Math.abs(diff) < 0.2 ? target : current + diff * 0.04;
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

  const prevPhaseRef = useRef(uploadPhase);
  useEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = uploadPhase;
    if (prev !== uploadPhase && (uploadPhase === "processing" || uploadPhase === "done")) {
      fetchStories();
    }
  }, [uploadPhase, fetchStories]);

  useEffect(() => {
    if (!externalGroups || externalGroups.length === 0) return;
    setOrderedGroups((prev) => {
      const externalIds = new Set(externalGroups.map((g) => g.creatorId));
      const kept        = prev.filter((g) => !externalIds.has(g.creatorId));
      const active      = externalGroups.filter((g) => g.items.length > 0);
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
            if (uploadPhaseRef.current === "processing") {
              targetPctRef.current = 100;
              markProcessingComplete();
            }
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isCreator, globalViewer?.id, fetchStories, markProcessingComplete]);

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
          markProcessingComplete();
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [uploadPhase, currentStoryId, fetchStories, markProcessingComplete]);

  const openUpload = useCallback(() => {
    if (isUploading) return;
    clearError();
    setUploadOpen(true);
  }, [isUploading, clearError]);

  const handleUploadStart = useCallback((job: UploadJob) => {
    setUploadOpen(false);
    startUpload(job);
  }, [startUpload]);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "right" ? 260 : -260, behavior: "smooth" });
  };

  const ownGroup = isCreator && globalViewer
    ? orderedGroups.find((g) => g.creatorId === globalViewer.id) ?? null
    : null;

  const displayGroups = orderedGroups.filter(
    (g) => g.creatorId !== globalViewer?.id && !allProcessing(g)
  );

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
    if (viewableIndex === -1 || viewableGroups[viewableIndex].items.length === 0) return;
    onOpenViewer?.(viewableGroups, viewableIndex);
  }, [displayGroups, onOpenViewer]);

  const displayPct    = displayPctState;
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

        @keyframes sb-pulse {
          0%,100% { box-shadow:${GLOW}; }
          50%      { box-shadow:0 0 20px rgba(139,92,246,0.8),0 0 40px rgba(236,72,153,0.5); }
        }
        @keyframes sb-spin { to { transform:rotate(360deg); } }

        .sb-card {
          cursor: pointer;
          transition: transform 0.18s ease, opacity 0.18s ease;
          flex-shrink: 0;
          -webkit-tap-highlight-color: rgba(0,0,0,0);
          tap-highlight-color: rgba(0,0,0,0);
          user-select: none;
        }
        .sb-card:hover { transform: scale(1.04); opacity: 0.92; }
        .sb-card:active { transform: scale(0.97); }

        .sb-add-card {
          cursor: pointer;
          transition: transform 0.18s ease, opacity 0.18s ease;
          flex-shrink: 0;
          -webkit-tap-highlight-color: rgba(0,0,0,0);
          tap-highlight-color: rgba(0,0,0,0);
          user-select: none;
        }
        .sb-add-card:hover { transform: scale(1.04); opacity: 0.92; }
        .sb-add-card:active { transform: scale(0.97); }

        .sb-upload-overlay { background: rgba(0,0,0,0.45); transition: background 0.15s; }
        .sb-upload-overlay:hover { background: rgba(0,0,0,0.65); }
        .sb-upload-overlay:hover .sb-upload-pct { display:none; }
        .sb-upload-overlay:hover .sb-upload-x { display:flex !important; }
      `}</style>

      {uploadOpen && (
        <StoryUploadModal
          onClose={() => setUploadOpen(false)}
          onUploadStart={handleUploadStart}
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
          style={{ display:"flex", gap:10, overflowX:"auto", scrollbarWidth:"none", msOverflowStyle:"none", alignItems:"flex-start" }}
        >
          {/* ── CREATOR CARD ── */}
          {isCreator && globalViewer && (
            <div className="sb-add-card" style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
              <div style={{ position:"relative", width:CARD_W, height:CARD_H }}>
                <div style={{
                  position:     "absolute",
                  inset:        0,
                  borderRadius: CARD_RADIUS,
                  padding:      BORDER,
                  background:   isUploading ? "transparent" : hasOwnStories ? GRADIENT : "transparent",
                  border:       !isUploading && !hasOwnStories ? `${BORDER}px solid #6D6D8A` : "none",
                  boxSizing:    "border-box",
                  boxShadow:    !isUploading && hasOwnStories ? GLOW : "none",
                  animation:    !isUploading && hasOwnStories ? "sb-pulse 3s ease-in-out infinite" : "none",
                }}>
                  <div
                    onClick={!isUploading && hasOwnStories ? handleOpenOwnStories : undefined}
                    style={{ width:"100%", height:"100%", borderRadius:CARD_RADIUS - BORDER, backgroundColor:"#0D0D18", overflow:"hidden", position:"relative", display:"flex", alignItems:"center", justifyContent:"center" }}
                  >
                    {hasOwnStories && ownThumbnail ? (
                      <ThumbnailWithFallback
                        src={ownThumbnail}
                        name={globalViewer.display_name || globalViewer.username || "?"}
                        avatarUrl={globalViewer.avatar_url ?? null}
                        fill
                      />
                    ) : (
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
                        <Avatar src={globalViewer.avatar_url ?? null} name={globalViewer.display_name || globalViewer.username || "?"} size={52} />
                      </div>
                    )}

                    {isUploading && (
                      <div
                        className="sb-upload-overlay"
                        onClick={(e) => { e.stopPropagation(); cancelUpload(); }}
                        style={{ position:"absolute", inset:0, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", zIndex:3, borderRadius:CARD_RADIUS - BORDER }}
                      >
                        <span className="sb-upload-pct" style={{ color:"#fff", fontSize:18, fontWeight:700, fontFamily:"'Inter',sans-serif", pointerEvents:"none" }}>
                          {`${displayPct}%`}
                        </span>
                        <span className="sb-upload-x" style={{ color:"#fff", pointerEvents:"none", display:"none" }}>
                          <X size={22} strokeWidth={2.5} />
                        </span>
                      </div>
                    )}

                    {!isUploading && (
                      <div style={{ position:"absolute", bottom:0, left:0, right:0, background:"linear-gradient(to top, rgba(0,0,0,0.82) 0%, transparent 100%)", padding:"18px 6px 7px", borderBottomLeftRadius:CARD_RADIUS - BORDER, borderBottomRightRadius:CARD_RADIUS - BORDER }}>
                        <span style={{ color:"#fff", fontSize:11, fontWeight:700, fontFamily:"'Inter',sans-serif", display:"block", textAlign:"center", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {globalViewer.username || globalViewer.display_name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {isUploading && (
                  <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"none", zIndex:6 }}>
                    <div style={{ width:36, height:36, borderRadius:"50%", border:"3px solid rgba(139,92,246,0.25)", borderTop:"3px solid #8B5CF6", borderRight:"3px solid #EC4899", animation:"sb-spin 0.9s linear infinite" }} />
                  </div>
                )}

                {!isUploading && (
                  <button
                    onClick={(e) => { e.stopPropagation(); openUpload(); }}
                    style={{ position:"absolute", top:8, right:8, width:22, height:22, borderRadius:"50%", background:GRADIENT, border:"2px solid #0A0A0F", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", padding:0, zIndex:4 }}
                  >
                    <Plus size={11} color="#fff" strokeWidth={2.5} />
                  </button>
                )}

                {uploadError && !isUploading && (
                  <button
                    title={uploadError}
                    onClick={(e) => { e.stopPropagation(); clearError(); setUploadOpen(true); }}
                    style={{ position:"absolute", top:8, right:8, width:22, height:22, borderRadius:"50%", background:"#EF4444", border:"2px solid #0A0A0F", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", padding:0, zIndex:4 }}
                  >
                    <AlertCircle size={11} color="#fff" />
                  </button>
                )}
              </div>

              <button
                onClick={isUploading ? cancelUpload : openUpload}
                style={{ background:"none", border:"none", cursor:"pointer", padding:"2px 4px", fontSize:11, fontWeight:700, color: isUploading ? "#EF4444" : uploadError ? "#EF4444" : "#C084FC", maxWidth:CARD_W, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", textAlign:"center", fontFamily:"'Inter',sans-serif" }}
              >
                {isUploading ? "Cancel" : "Add to story"}
              </button>
            </div>
          )}

          {/* ── SKELETON ── */}
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, flexShrink:0 }}>
                  <div style={{ width:CARD_W, height:CARD_H, borderRadius:CARD_RADIUS, backgroundColor:"#1C1C2E" }} />
                  <div style={{ width:50, height:10, borderRadius:4, backgroundColor:"#1C1C2E" }} />
                </div>
              ))
            : displayGroups.map((group, idx) => {
                const isViewed = !group.hasUnviewed;
                return (
                  <div
                    key={group.creatorId}
                    className="sb-card"
                    onClick={() => handleOpenStory(idx)}
                    style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, WebkitTapHighlightColor:"rgba(0,0,0,0)" }}
                  >
                    <div style={{ position:"relative", width:CARD_W, height:CARD_H }}>
                      <div style={{
                        position:     "absolute",
                        inset:        0,
                        borderRadius: CARD_RADIUS,
                        padding:      BORDER,
                        background:   VIEWED_RING,
                        boxSizing:    "border-box",
                        boxShadow:    "none",
                        animation:    "none",
                        transition:   "all 0.4s ease",
                      }}>
                        <div style={{ width:"100%", height:"100%", borderRadius:CARD_RADIUS - BORDER, backgroundColor:"#0D0D18", overflow:"hidden", position:"relative" }}>
                          {group.latestThumbnail ? (
                            <ThumbnailWithFallback src={group.latestThumbnail} name={group.displayName} avatarUrl={group.avatarUrl} fill />
                          ) : (
                            <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center" }}>
                              <Avatar src={group.avatarUrl} name={group.displayName} size={52} />
                            </div>
                          )}

                          {/* ── FIXED: use AvatarWithStoryRing instead of plain Avatar ── */}
                          <div style={{ position:"absolute", top:6, right:6, zIndex:3 }}>
                            <AvatarWithStoryRing
                              src={group.avatarUrl}
                              alt={group.displayName}
                              size={44}
                              hasStory
                              hasUnviewed={!isViewed}
                              onClick={(e) => e.stopPropagation()}
                              borderColor="#0D0D18"
                            />
                          </div>

                          <div style={{ position:"absolute", bottom:0, left:0, right:0, background:"linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)", padding:"20px 6px 7px", borderBottomLeftRadius:CARD_RADIUS - BORDER, borderBottomRightRadius:CARD_RADIUS - BORDER }}>
                            <span style={{ color:"#fff", fontSize:11, fontWeight:700, fontFamily:"'Inter',sans-serif", display:"block", textAlign:"center", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", opacity: isViewed ? 0.6 : 1, transition:"opacity 0.4s ease" }}>
                              {group.username}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
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
  src, name, avatarUrl, size, fill,
}: {
  src: string; name: string; avatarUrl: string | null; size?: number; fill?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (fill) {
    if (failed) {
      return (
        <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Avatar src={avatarUrl} name={name} size={52} />
        </div>
      );
    }
    return (
      <img src={src} alt={name} onError={() => setFailed(true)}
        style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", display:"block" }}
      />
    );
  }
  if (failed) return <Avatar src={avatarUrl} name={name} size={size ?? 80} />;
  return (
    <div style={{ position:"relative", width:size, height:size, borderRadius:"50%", overflow:"hidden" }}>
      <img src={src} alt={name} onError={() => setFailed(true)}
        style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}
      />
    </div>
  );
}

export type { StoryBarProps };