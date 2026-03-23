"use client";

import { use, useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock, Trash2, X } from "lucide-react";
import { MediaLightbox } from "@/components/messages/MediaLightbox";

interface MediaItem {
  id:           number;
  messageId:    number;
  url:          string | null;
  thumbnailUrl: string | null;
  mediaType:    "image" | "video";
  isPPV:        boolean;
  isUnlocked:   boolean;
  isSender:     boolean;
  createdAt:    string;
}

type Filter = "all" | "images" | "videos" | "unlocked";

function groupByMonth(items: MediaItem[]): { label: string; items: MediaItem[] }[] {
  const map = new Map<string, MediaItem[]>();
  for (const item of items) {
    const date  = new Date(item.createdAt);
    const label = date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(item);
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

function VideoThumb({ src, blurred }: { src: string; blurred: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef  = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const handleSeeked = () => {
      try {
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width  = video.videoWidth  || 320;
        canvas.height = video.videoHeight || 320;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setReady(true);
      } catch {}
    };
    video.addEventListener("seeked", handleSeeked);
    video.currentTime = 0.001;
    return () => video.removeEventListener("seeked", handleSeeked);
  }, [src]);

  const shared: React.CSSProperties = {
    position: "absolute", inset: 0, width: "100%", height: "100%",
    objectFit: "cover", filter: blurred ? "blur(8px) brightness(0.6)" : "none",
  };

  return (
    <>
      <video ref={videoRef} src={src} muted playsInline preload="metadata" crossOrigin="anonymous" style={{ display: "none" }} />
      <canvas ref={canvasRef} style={{ ...shared, display: ready ? "block" : "none" }} />
      {!ready && <video src={`${src}#t=0.001`} muted playsInline preload="metadata" style={shared} />}
    </>
  );
}

function MediaThumb({ item }: { item: MediaItem }) {
  const blurred = !item.isUnlocked;
  if (item.mediaType === "image" || (item.mediaType === "video" && item.thumbnailUrl)) {
    const src = item.thumbnailUrl ?? item.url;
    if (!src) return <div style={{ width: "100%", height: "100%", backgroundColor: "#1E1E2E" }} />;
    return <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: blurred ? "blur(8px) brightness(0.6)" : "none" }} />;
  }
  if (item.mediaType === "video" && item.url) return <VideoThumb src={item.url} blurred={blurred} />;
  return <div style={{ width: "100%", height: "100%", backgroundColor: "#1E1E2E" }} />;
}

export default function GalleryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router  = useRouter();

  const [filter,      setFilter]      = useState<Filter>("all");
  const [items,       setItems]       = useState<MediaItem[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor,  setNextCursor]  = useState<string | null>(null);
  const [hasMore,     setHasMore]     = useState(true);
  const [lightbox,    setLightbox]    = useState<{ items: { url: string; type: "image" | "video"; messageId: number }[]; initialIndex: number } | null>(null);

  const [selectionMode,  setSelectionMode]  = useState(false);
  const [selectedIds,    setSelectedIds]    = useState<Set<number>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<number | null>(null);
  const [confirmDelete,  setConfirmDelete]  = useState(false);
  const [deleting,       setDeleting]       = useState(false);

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress   = useRef(false);
  const loaderRef      = useRef<HTMLDivElement>(null);

  const fetchMedia = useCallback(async (cursor: string | null, currentFilter: Filter, reset = false) => {
    if (reset) setLoading(true); else setLoadingMore(true);
    try {
      const p = new URLSearchParams({ filter: currentFilter });
      if (cursor) p.set("cursor", cursor);
      const res  = await fetch(`/api/conversations/${id}/media?${p}`);
      if (!res.ok) return;
      const data = await res.json();
      setItems((prev) => reset ? (data.mediaItems ?? []) : [...prev, ...(data.mediaItems ?? [])]);
      setNextCursor(data.nextCursor ?? null);
      setHasMore(!!data.nextCursor);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [id]);

  useEffect(() => {
    setItems([]); setNextCursor(null); setHasMore(true);
    setSelectionMode(false); setSelectedIds(new Set());
    fetchMedia(null, filter, true);
  }, [filter, fetchMedia]);

  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) fetchMedia(nextCursor, filter); },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, nextCursor, filter, fetchMedia]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") exitSelection(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const exitSelection = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
    setLastSelectedId(null);
  };

  const enterSelection = (itemId?: number) => {
    setSelectionMode(true);
    if (itemId !== undefined) {
      setSelectedIds(new Set([itemId]));
      setLastSelectedId(itemId);
    }
  };

  const selectAll = () => setSelectedIds(new Set(items.map((i) => i.id)));

  const toggleSelect = (item: MediaItem, shiftKey = false) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (shiftKey && lastSelectedId !== null) {
        const allIds   = items.map((i) => i.id);
        const fromIdx  = allIds.indexOf(lastSelectedId);
        const toIdx    = allIds.indexOf(item.id);
        const [lo, hi] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
        for (let i = lo; i <= hi; i++) next.add(allIds[i]);
      } else {
        if (next.has(item.id)) next.delete(item.id);
        else next.add(item.id);
      }
      return next;
    });
    setLastSelectedId(item.id);
  };

  // Mobile — long press enters selection
  const onTouchStart = (item: MediaItem) => {
    didLongPress.current   = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      if (!selectionMode) enterSelection(item.id);
      else toggleSelect(item);
    }, 500);
  };
  const onTouchEnd  = () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); };
  const onTouchMove = () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); };

  // Desktop — right click enters selection
  const onContextMenu = (item: MediaItem, e: React.MouseEvent) => {
    e.preventDefault();
    if (!selectionMode) enterSelection(item.id);
    else toggleSelect(item, e.shiftKey);
  };

  // Click — open lightbox outside selection, select inside
  const onItemClick = (item: MediaItem, e: React.MouseEvent) => {
    if (didLongPress.current) { didLongPress.current = false; return; }
    if (selectionMode) { toggleSelect(item, e.shiftKey); return; }
    if (item.isUnlocked) openLightbox(item);
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    try {
      const messageIds = [...new Set(items.filter((i) => selectedIds.has(i.id)).map((i) => i.messageId))];
      await fetch(`/api/conversations/${id}/media`, {
        method:  "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ messageIds }),
      });
      setItems((prev) => prev.filter((i) => !selectedIds.has(i.id)));
      exitSelection();
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const openLightbox = (clickedItem: MediaItem) => {
    const unlocked      = items.filter((i) => i.isUnlocked && i.url);
    const lightboxItems = unlocked.map((i) => ({ url: i.url!, type: i.mediaType, messageId: i.messageId }));
    const idx           = unlocked.findIndex((i) => i.id === clickedItem.id);
    setLightbox({ items: lightboxItems, initialIndex: Math.max(0, idx) });
  };

  const groups  = groupByMonth(items);
  const filters: { key: Filter; label: string }[] = [
    { key: "all",      label: "All"      },
    { key: "unlocked", label: "Unlocked" },
    { key: "images",   label: "Images"   },
    { key: "videos",   label: "Videos"   },
  ];

  return (
    <>
      <style>{`
        .gallery-root {
          display: flex; flex-direction: column; height: 100%; max-height: 100%;
          background-color: #0A0A0F; font-family: 'Inter', sans-serif;
        }
        @media (max-width: 767px) {
          .gallery-root {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 100;
            padding-top: env(safe-area-inset-top, 0px);
            padding-bottom: env(safe-area-inset-bottom, 0px);
          }
        }
        .gallery-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; }
        .gallery-thumb {
          position: relative; aspect-ratio: 1; overflow: hidden;
          background-color: #1E1E2E; cursor: pointer;
          user-select: none; -webkit-touch-callout: none;
        }
        .thumb-inner { position: absolute; inset: 0; transition: transform 0.18s ease; }
        .gallery-thumb.selected .thumb-inner { transform: scale(0.91); }
        .thumb-tint {
          position: absolute; inset: 0; z-index: 3;
          background: rgba(139,92,246,0.28);
          opacity: 0; transition: opacity 0.15s ease; pointer-events: none;
        }
        .gallery-thumb.selected .thumb-tint { opacity: 1; }
        .thumb-check {
          position: absolute; top: 6px; left: 6px; z-index: 10;
          width: 22px; height: 22px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.85);
          background: rgba(0,0,0,0.3);
          display: flex; align-items: center; justify-content: center;
          opacity: 0; transition: opacity 0.15s ease, background 0.15s ease;
          pointer-events: none;
        }
        .selection-mode .thumb-check { opacity: 1; }
        .gallery-thumb.selected .thumb-check { opacity: 1; background: #8B5CF6; border-color: #8B5CF6; }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .skeleton { background: linear-gradient(90deg, #1E1E2E 25%, #2A2A3D 50%, #1E1E2E 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; aspect-ratio: 1; }
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        .delete-bar      { animation: slideUp 0.2s ease forwards; }
        .confirm-overlay { animation: fadeIn 0.15s ease forwards; }
        .hdr-btn { background: none; border: 1px solid #2A2A3D; border-radius: 8px; color: #A3A3C2; font-size: 13px; font-weight: 600; padding: 6px 12px; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.15s ease; white-space: nowrap; }
        .hdr-btn:hover { border-color: #8B5CF6; color: #8B5CF6; }
        .hdr-btn.purple { border-color: #8B5CF6; color: #8B5CF6; background: rgba(139,92,246,0.1); }
      `}</style>

      {lightbox && (
        <MediaLightbox items={lightbox.items} initialIndex={lightbox.initialIndex} onClose={() => setLightbox(null)} />
      )}

      {confirmDelete && (
        <div className="confirm-overlay" onClick={() => setConfirmDelete(false)} style={{ position: "fixed", inset: 0, zIndex: 200, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: "#1C1C2E", border: "1px solid #2A2A3D", borderRadius: "16px", padding: "24px", width: "300px", boxShadow: "0 8px 32px rgba(0,0,0,0.6)", fontFamily: "'Inter',sans-serif" }}>
            <p style={{ margin: "0 0 6px", fontSize: "16px", fontWeight: 700, color: "#FFFFFF" }}>Delete {selectedIds.size} item{selectedIds.size > 1 ? "s" : ""}?</p>
            <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#A3A3C2" }}>This removes selected media from your view only. This can't be undone.</p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "1px solid #2A2A3D", backgroundColor: "transparent", color: "#A3A3C2", fontSize: "14px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>Cancel</button>
              <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "none", backgroundColor: "#EF4444", color: "#FFFFFF", fontSize: "14px", fontWeight: 600, cursor: deleting ? "default" : "pointer", fontFamily: "'Inter',sans-serif", opacity: deleting ? 0.7 : 1 }}>
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`gallery-root${selectionMode ? " selection-mode" : ""}`}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "0 16px", height: "56px", flexShrink: 0, backgroundColor: "#0D0D1A", borderBottom: "1px solid #1E1E2E" }}>
          {selectionMode ? (
            <>
              <button onClick={exitSelection} style={{ background: "none", border: "none", cursor: "pointer", color: "#A3A3C2", display: "flex", padding: "4px", borderRadius: "6px" }} onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")} onMouseLeave={(e) => (e.currentTarget.style.color = "#A3A3C2")}>
                <X size={20} strokeWidth={1.8} />
              </button>
              <span style={{ flex: 1, fontSize: "16px", fontWeight: 700, color: "#FFFFFF" }}>
                {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select items"}
              </span>
              <button onClick={selectAll} className="hdr-btn purple">Select all</button>
            </>
          ) : (
            <>
              <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", color: "#A3A3C2", display: "flex", padding: "4px", borderRadius: "6px" }} onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")} onMouseLeave={(e) => (e.currentTarget.style.color = "#A3A3C2")}>
                <ArrowLeft size={20} strokeWidth={1.8} />
              </button>
              <p style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#FFFFFF", flex: 1 }}>Chat Gallery</p>
              <button onClick={() => enterSelection()} className="hdr-btn">Select</button>
            </>
          )}
        </div>

        {/* Filter tabs */}
        {!selectionMode && (
          <div style={{ display: "flex", gap: "8px", padding: "12px 16px", flexShrink: 0, borderBottom: "1px solid #1E1E2E", overflowX: "auto", scrollbarWidth: "none" }}>
            {filters.map(({ key, label }) => (
              <button key={key} onClick={() => setFilter(key)} style={{ padding: "6px 16px", borderRadius: "20px", border: `1px solid ${filter === key ? "#8B5CF6" : "#2A2A3D"}`, backgroundColor: filter === key ? "#8B5CF6" : "transparent", color: filter === key ? "#FFFFFF" : "#A3A3C2", fontSize: "13px", fontWeight: filter === key ? 600 : 400, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "'Inter',sans-serif", transition: "all 0.15s ease", flexShrink: 0 }}>
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Grid */}
        <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" }}>
          {loading ? (
            <div className="gallery-grid" style={{ padding: "2px" }}>
              {Array.from({ length: 12 }).map((_, i) => <div key={i} className="skeleton" />)}
            </div>
          ) : items.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "200px", gap: "12px" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "#1E1E2E", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="#4A4A6A" strokeWidth="1.5"/>
                  <rect x="12" y="3" width="7" height="7" rx="1.5" stroke="#4A4A6A" strokeWidth="1.5"/>
                  <rect x="3" y="12" width="7" height="7" rx="1.5" stroke="#4A4A6A" strokeWidth="1.5"/>
                  <rect x="12" y="12" width="7" height="7" rx="1.5" stroke="#4A4A6A" strokeWidth="1.5"/>
                </svg>
              </div>
              <p style={{ margin: 0, fontSize: "14px", color: "#4A4A6A" }}>No media found</p>
            </div>
          ) : (
            <div style={{ padding: "0 0 90px" }}>
              {groups.map(({ label, items: groupItems }) => (
                <div key={label}>
                  <div style={{ padding: "12px 16px 8px", position: "sticky", top: 0, backgroundColor: "#0A0A0F", zIndex: 10 }}>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#4A4A6A", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
                  </div>
                  <div className="gallery-grid">
                    {groupItems.map((item) => {
                      const isSelected = selectedIds.has(item.id);
                      return (
                        <div
                          key={item.id}
                          className={`gallery-thumb${isSelected ? " selected" : ""}`}
                          onClick={(e) => onItemClick(item, e)}
                          onContextMenu={(e) => onContextMenu(item, e)}
                          onTouchStart={() => onTouchStart(item)}
                          onTouchEnd={onTouchEnd}
                          onTouchMove={onTouchMove}
                        >
                          <div className="thumb-inner"><MediaThumb item={item} /></div>
                          <div className="thumb-tint" />
                          <div className="thumb-check">
                            {isSelected && (
                              <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                                <path d="M1 4.5L4 7.5L10 1" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                          {item.mediaType === "video" && item.isUnlocked && !isSelected && (
                            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", zIndex: 4 }}>
                              <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <svg width="12" height="14" viewBox="0 0 12 14" fill="none"><path d="M1.5 1.5L10.5 7L1.5 12.5V1.5Z" fill="#FFFFFF" /></svg>
                              </div>
                            </div>
                          )}
                          {item.isPPV && !item.isUnlocked && (
                            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px", backgroundColor: "rgba(0,0,0,0.3)", zIndex: 4, pointerEvents: "none" }}>
                              <Lock size={18} color="#FFFFFF" strokeWidth={1.8} />
                              <span style={{ fontSize: "10px", color: "#FFFFFF", fontWeight: 600 }}>PPV</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div ref={loaderRef} style={{ height: "40px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {loadingMore && <div style={{ width: "18px", height: "18px", borderRadius: "50%", border: "2px solid #2A2A3D", borderTopColor: "#8B5CF6", animation: "spin 0.7s linear infinite" }} />}
              </div>
            </div>
          )}
        </div>

        {/* Bottom delete bar */}
        {selectionMode && (
          <div className="delete-bar" style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#0D0D1A", borderTop: "1px solid #1E1E2E", padding: "12px 16px", paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))", display: "flex", gap: "12px", zIndex: 50 }}>
            <button onClick={exitSelection} style={{ flex: 1, padding: "12px", borderRadius: "12px", border: "1px solid #2A2A3D", backgroundColor: "transparent", color: "#A3A3C2", fontSize: "14px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
              Cancel
            </button>
            <button
              onClick={() => selectedIds.size > 0 && setConfirmDelete(true)}
              disabled={selectedIds.size === 0}
              style={{ flex: 2, padding: "12px", borderRadius: "12px", border: "none", backgroundColor: selectedIds.size > 0 ? "#EF4444" : "#1C1C2E", color: selectedIds.size > 0 ? "#FFFFFF" : "#4A4A6A", fontSize: "14px", fontWeight: 600, cursor: selectedIds.size > 0 ? "pointer" : "default", fontFamily: "'Inter',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "all 0.15s ease" }}
            >
              <Trash2 size={16} strokeWidth={1.8} />
              {selectedIds.size > 0 ? `Delete (${selectedIds.size})` : "Delete"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}