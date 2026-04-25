"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Lock, Trash2 } from "lucide-react";
import { MediaLightbox } from "@/components/messages/MediaLightbox";

export interface MediaItem {
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

interface Props {
  conversationId: string;
  items:          MediaItem[];
  loading:        boolean;
  loadingMore:    boolean;
  hasMore:        boolean;
  loaderRef:      React.RefObject<HTMLDivElement | null>;
  onDelete:       (itemIds: number[], messageIds: number[]) => Promise<void>;
}

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
    return (
      <img
        src={src}
        alt=""
        loading="lazy"
        draggable={false}
        style={{ width: "100%", height: "100%", objectFit: "cover", filter: blurred ? "blur(8px) brightness(0.6)" : "none" }}
      />
    );
  }
  if (item.mediaType === "video" && item.url) return <VideoThumb src={item.url} blurred={blurred} />;
  return <div style={{ width: "100%", height: "100%", backgroundColor: "#1E1E2E" }} />;
}

export default function MessageGalleryGrid({
  conversationId,
  items,
  loading,
  loadingMore,
  hasMore,
  loaderRef,
  onDelete,
}: Props) {
  const [lightbox,       setLightbox]       = useState<{ items: { url: string; type: "image" | "video"; messageId: number }[]; initialIndex: number } | null>(null);
  const [selectMode,     setSelectMode]     = useState(false);
  const [selectedIds,    setSelectedIds]    = useState<Set<number>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<number | null>(null);
  const [confirmDelete,  setConfirmDelete]  = useState(false);
  const [deleting,       setDeleting]       = useState(false);

  const selectModeRef      = useRef(false);
  const longPressTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress       = useRef(false);
  const touchStartPos      = useRef<{ x: number; y: number } | null>(null);
  const isTouchInteraction = useRef(false);

  useEffect(() => { selectModeRef.current = selectMode; }, [selectMode]);



  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") exitSelection(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const exitSelection = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
    setLastSelectedId(null);
  };

  const enterSelection = (itemId?: number) => {
    setSelectMode(true);
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
        next.has(item.id) ? next.delete(item.id) : next.add(item.id);
      }
      return next;
    });
    setLastSelectedId(item.id);
  };

  const onTouchStart = (item: MediaItem, e: React.TouchEvent) => {
    e.preventDefault(); // stops browser firing a click after touch
    didLongPress.current  = false;
    touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    longPressTimer.current = setTimeout(() => {
      longPressTimer.current = null; // mark as fired
      didLongPress.current   = true;
      if (!selectModeRef.current) enterSelection(item.id);
      else toggleSelect(item);
    }, 500);
  };

  const onTouchEnd = (item: MediaItem) => {
    if (longPressTimer.current) {
      // Timer still pending → short tap
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
      if (selectModeRef.current) toggleSelect(item);
      else if (item.isUnlocked) openLightbox(item);
    }
    // Timer already fired (long press) → do nothing, handled in timer
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos.current || !longPressTimer.current) return;
    const dx = Math.abs(e.touches[0].clientX - touchStartPos.current.x);
    const dy = Math.abs(e.touches[0].clientY - touchStartPos.current.y);
    if (dx > 10 || dy > 10) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const onContextMenu = (item: MediaItem, e: React.MouseEvent) => {
    e.preventDefault();
    if (!selectMode) enterSelection(item.id);
    else toggleSelect(item, e.shiftKey);
  };

  const onItemClick = (item: MediaItem, e: React.MouseEvent) => {
    if (didLongPress.current) { didLongPress.current = false; return; }
    if (selectModeRef.current) { toggleSelect(item, e.shiftKey); return; }
    if (item.isUnlocked) openLightbox(item);
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    try {
      const itemIds    = Array.from(selectedIds);
      const messageIds = [...new Set(
  items
    .filter((i) => selectedIds.has(i.id))
    .map((i) => i.messageId)
    .filter((msgId) => items.filter((i) => i.messageId === msgId).every((i) => selectedIds.has(i.id)))
)];
      console.log("selectedIds", Array.from(selectedIds));
      console.log("itemIds", itemIds);
      console.log("messageIds", messageIds);
      await onDelete(itemIds, messageIds);
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

  const groups = groupByMonth(items);

  return (
    <>
      <style>{`
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        .mgrid-skeleton  { background: linear-gradient(90deg,#1E1E2E 25%,#2A2A3D 50%,#1E1E2E 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; aspect-ratio: 1; }
        .mgrid-thumb     { position: relative; aspect-ratio: 1; overflow: hidden; background-color: #1E1E2E; cursor: pointer; user-select: none; -webkit-touch-callout: none; }
        .mgrid-inner     { position: absolute; inset: 0; transition: transform 0.18s ease; }
        .mgrid-thumb.selected .mgrid-inner { transform: scale(0.91); }
        .mgrid-tint      { position: absolute; inset: 0; z-index: 3; background: rgba(139,92,246,0.28); opacity: 0; transition: opacity 0.15s ease; pointer-events: none; }
        .mgrid-thumb.selected .mgrid-tint { opacity: 1; }
        .mgrid-check     { position: absolute; top: 6px; right: 6px; z-index: 10; width: 22px; height: 22px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.85); background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.15s, background 0.15s; pointer-events: none; }
        .select-mode .mgrid-check { opacity: 1; }
        .mgrid-thumb.selected .mgrid-check { opacity: 1; background: #8B5CF6; border-color: #8B5CF6; }
        .confirm-overlay { animation: fadeIn 0.15s ease forwards; }
      `}</style>

      {lightbox && (
        <MediaLightbox items={lightbox.items} initialIndex={lightbox.initialIndex} onClose={() => setLightbox(null)} />
      )}

      {confirmDelete && (
        <div
          className="confirm-overlay"
          onClick={() => setConfirmDelete(false)}
          style={{ position: "fixed", inset: 0, zIndex: 200, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: "#1C1C2E", border: "1px solid #2A2A3D", borderRadius: "16px", padding: "24px", width: "300px", boxShadow: "0 8px 32px rgba(0,0,0,0.6)", fontFamily: "'Inter',sans-serif" }}
          >
            <p style={{ margin: "0 0 6px", fontSize: "16px", fontWeight: 700, color: "#FFFFFF" }}>
              Delete {selectedIds.size} item{selectedIds.size > 1 ? "s" : ""}?
            </p>
            <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#A3A3C2" }}>
              This removes selected media from your view only. This can't be undone.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "1px solid #2A2A3D", backgroundColor: "transparent", color: "#A3A3C2", fontSize: "14px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "none", backgroundColor: "#EF4444", color: "#FFFFFF", fontSize: "14px", fontWeight: 600, cursor: deleting ? "default" : "pointer", fontFamily: "'Inter',sans-serif", opacity: deleting ? 0.7 : 1 }}
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action bar — mirrors SavedPostGrid */}
      <div style={{
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "space-between",
        padding:         "10px 16px",
        minHeight:       "44px",
        backgroundColor: selectMode ? "rgba(239,68,68,0.08)" : "transparent",
        borderBottom:    selectMode ? "1px solid rgba(239,68,68,0.2)" : "1px solid transparent",
        transition:      "background-color 0.2s ease, border-color 0.2s ease",
      }}>
        {selectMode ? (
          <>
            <button
              onClick={exitSelection}
              style={{ background: "none", border: "none", color: "#A3A3C2", fontSize: "14px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif", padding: "6px 0" }}
            >
              Cancel
            </button>
            <span style={{ fontSize: "13px", fontWeight: 600, color: selectedIds.size > 0 ? "#F1F5F9" : "#6B6B8A", fontFamily: "'Inter',sans-serif" }}>
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Tap to select"}
            </span>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button
                onClick={selectAll}
                style={{ background: "none", border: "1px solid #2A2A3D", color: "#A3A3C2", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif", padding: "5px 12px", borderRadius: "20px", backgroundColor: "#1C1C2E" }}
              >
                All
              </button>
              <button
                onClick={() => selectedIds.size > 0 && setConfirmDelete(true)}
                disabled={selectedIds.size === 0}
                style={{
                  display:         "flex",
                  alignItems:      "center",
                  gap:             "5px",
                  padding:         "7px 14px",
                  borderRadius:    "20px",
                  border:          "none",
                  backgroundColor: selectedIds.size > 0 ? "#EF4444" : "rgba(239,68,68,0.2)",
                  color:           selectedIds.size > 0 ? "#FFFFFF" : "rgba(239,68,68,0.4)",
                  fontSize:        "13px",
                  fontWeight:      700,
                  cursor:          selectedIds.size > 0 ? "pointer" : "default",
                  fontFamily:      "'Inter',sans-serif",
                  transition:      "all 0.15s",
                }}
              >
                <Trash2 size={13} />
                Delete{selectedIds.size > 1 ? ` (${selectedIds.size})` : ""}
              </button>
            </div>
          </>
        ) : (
          <>
            <span style={{ fontSize: "12px", color: "#4A4A6A", fontFamily: "'Inter',sans-serif" }}>
              Hold any item to select
            </span>
            <button
              onClick={() => setSelectMode(true)}
              style={{ background: "none", border: "1px solid #2A2A3D", color: "#A3A3C2", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif", padding: "5px 12px", borderRadius: "20px", backgroundColor: "#1C1C2E" }}
            >
              Select
            </button>
          </>
        )}
      </div>

      {/* Grid content */}
      <div className={selectMode ? "select-mode" : ""}>
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "2px", padding: "2px" }}>
            {Array.from({ length: 12 }).map((_, i) => <div key={i} className="mgrid-skeleton" />)}
          </div>
        ) : items.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "200px", gap: "12px" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "#1E1E2E", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <rect x="3"  y="3"  width="7" height="7" rx="1.5" stroke="#4A4A6A" strokeWidth="1.5"/>
                <rect x="12" y="3"  width="7" height="7" rx="1.5" stroke="#4A4A6A" strokeWidth="1.5"/>
                <rect x="3"  y="12" width="7" height="7" rx="1.5" stroke="#4A4A6A" strokeWidth="1.5"/>
                <rect x="12" y="12" width="7" height="7" rx="1.5" stroke="#4A4A6A" strokeWidth="1.5"/>
              </svg>
            </div>
            <p style={{ margin: 0, fontSize: "14px", color: "#4A4A6A", fontFamily: "'Inter',sans-serif" }}>No media found</p>
          </div>
        ) : (
          <div style={{ paddingBottom: "90px" }}>
            {groups.map(({ label, items: groupItems }) => (
              <div key={label}>
                <div style={{ padding: "12px 16px 8px", position: "sticky", top: 0, backgroundColor: "#0A0A0F", zIndex: 10 }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#4A4A6A", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "2px" }}>
                  {groupItems.map((item) => {
                    const isSelected = selectedIds.has(item.id);
                    return (
                      <div
                        key={item.id}
                        className={`mgrid-thumb${isSelected ? " selected" : ""}`}
                        onClick={(e) => onItemClick(item, e)}
                        onContextMenu={(e) => onContextMenu(item, e)}
                        onTouchStart={(e) => onTouchStart(item, e)}
                        onTouchEnd={() => onTouchEnd(item)}
                        onTouchMove={(e) => onTouchMove(e)}
                      >
                        <div className="mgrid-inner"><MediaThumb item={item} /></div>
                        <div className="mgrid-tint" />
                        <div className="mgrid-check">
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
              {loadingMore && (
                <div style={{ width: "18px", height: "18px", borderRadius: "50%", border: "2px solid #2A2A3D", borderTopColor: "#8B5CF6", animation: "spin 0.7s linear infinite" }} />
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}