"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Heart } from "lucide-react";

interface ViewerItem {
  userId:      string;
  displayName: string;
  avatarUrl:   string | null;
  liked:       boolean;
  viewedAt:    string;
}

interface Props {
  storyId:   number;
  viewCount: number;
  open:      boolean;
  onOpen:    () => void;
  onClose:   () => void;
}

export default function StoryViewersSheet({ storyId, viewCount, open, onOpen, onClose }: Props) {
  const [viewers,        setViewers]        = useState<ViewerItem[]>([]);
  const [viewersLoading, setViewersLoading] = useState(false);
  const [viewersError,   setViewersError]   = useState<string | null>(null);
  const [likeCount,      setLikeCount]      = useState(0);

  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef  = useRef({ active: false, startY: 0 });

  useEffect(() => {
    let cancelled = false;
    setViewersLoading(true);
    setViewersError(null);
    fetch(`/api/stories/${storyId}/viewers`, { cache: "no-store" })
      .then((res) => res.json().then((data) => ({ res, data })))
      .then(({ res, data }) => {
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error ?? "Failed to load viewers");
        setViewers(data.viewers);
        setLikeCount(data.likeCount);
      })
      .catch((e: any) => { if (!cancelled) setViewersError(e.message ?? "Error loading viewers"); })
      .finally(() => { if (!cancelled) setViewersLoading(false); });
    return () => { cancelled = true; };
  }, [storyId]);

  const handleOpen = useCallback(() => { onOpen(); }, [onOpen]);

  const stop = {
    onTouchStart: (e: React.TouchEvent) => e.stopPropagation(),
    onTouchEnd:   (e: React.TouchEvent) => e.stopPropagation(),
    onMouseDown:  (e: React.MouseEvent) => e.stopPropagation(),
    onMouseUp:    (e: React.MouseEvent) => e.stopPropagation(),
  };

  return (
    <>
      {/* Viewers pill */}
      {!open && (
        <div
          {...stop}
          style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "8px 16px calc(env(safe-area-inset-bottom) + 14px)", zIndex: 10 }}
        >
          <button
            onClick={handleOpen}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 24, padding: "10px 16px", cursor: "pointer",
              backdropFilter: "blur(8px)",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
            </svg>
            <span style={{ color: "#fff", fontSize: 14, fontWeight: 600, fontFamily: "Inter,sans-serif" }}>
              {viewCount ?? 0}
            </span>
          </button>
        </div>
      )}

      {/* Bottom sheet */}
      {open && (
        <div
          {...stop}
          style={{ position: "absolute", inset: 0, zIndex: 20 }}
        >
          {/* Backdrop */}
          <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} />

          {/* Panel */}
          <div
            ref={panelRef}
            onTouchStart={(e) => { dragRef.current = { active: true, startY: e.touches[0].clientY }; }}
            onTouchMove={(e) => {
              if (!dragRef.current.active) return;
              const dy = e.touches[0].clientY - dragRef.current.startY;
              if (dy > 0 && panelRef.current) {
                panelRef.current.style.transform = `translateY(${dy}px)`;
                panelRef.current.style.transition = "none";
              }
            }}
            onTouchEnd={(e) => {
              if (!dragRef.current.active) return;
              dragRef.current.active = false;
              const dy = e.changedTouches[0].clientY - dragRef.current.startY;
              if (dy > 80) {
                onClose();
              } else if (panelRef.current) {
                panelRef.current.style.transition = "transform 0.25s cubic-bezier(0.32,0.72,0,1)";
                panelRef.current.style.transform  = "translateY(0)";
              }
            }}
            style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              background: "#0D0D18", borderRadius: "20px 20px 0 0",
              maxHeight: "65vh", display: "flex", flexDirection: "column",
              animation: "sv-sheet-in 0.32s cubic-bezier(0.32,0.72,0,1) forwards",
              willChange: "transform",
            }}
          >
            {/* Drag handle */}
            <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 8px" }}>
              <div style={{ width: 40, height: 4, borderRadius: 4, background: "#2A2A3D" }} />
            </div>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 20px 12px", borderBottom: "1px solid #2A2A3D" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                </svg>
                <span style={{ color: "#fff", fontSize: 15, fontWeight: 600, fontFamily: "Inter,sans-serif" }}>{viewCount ?? 0}</span>
              </div>
              {likeCount > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Heart size={15} fill="#EC4899" color="#EC4899" />
                  <span style={{ color: "#EC4899", fontSize: 14, fontWeight: 600, fontFamily: "Inter,sans-serif" }}>{likeCount}</span>
                </div>
              )}
            </div>

            {/* List */}
            <div style={{ overflowY: "auto", flex: 1, padding: "6px 0 calc(env(safe-area-inset-bottom) + 8px)" }}>

              {/* Skeleton */}
              {viewersLoading && [0, 1, 2].map((i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#1A1A2E", animation: `sv-shimmer 1.4s ease ${i * 0.15}s infinite` }} />
                  <div style={{ flex: 1, height: 13, borderRadius: 7, background: "#1A1A2E", animation: `sv-shimmer 1.4s ease ${i * 0.15 + 0.08}s infinite` }} />
                </div>
              ))}

              {/* Error */}
              {viewersError && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 20px", gap: 8 }}>
                  <span style={{ fontSize: 13, color: "#F87171", fontFamily: "Inter,sans-serif" }}>{viewersError}</span>
                  <button onClick={handleOpen} style={{ fontSize: 13, color: "#8B5CF6", fontFamily: "Inter,sans-serif", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Retry</button>
                </div>
              )}

              {/* Empty */}
              {!viewersLoading && !viewersError && viewers.length === 0 && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 20px", gap: 10 }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4A4A6A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                  </svg>
                  <span style={{ fontSize: 14, color: "#6B6B8A", fontFamily: "Inter,sans-serif" }}>No views yet</span>
                </div>
              )}

              {/* Viewer rows */}
              {!viewersLoading && !viewersError && viewers.map((v, i) => (
                <div
                  key={v.userId}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", animation: "sv-row-in 0.22s ease forwards", animationDelay: `${i * 45}ms`, opacity: 0 }}
                >
                  {v.avatarUrl ? (
                    <img src={v.avatarUrl} alt={v.displayName} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#2A2A3D", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#8A8AA0", fontFamily: "Inter,sans-serif" }}>{v.displayName.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: "#fff", fontFamily: "Inter,sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {v.displayName}
                  </span>
                  {v.liked && <Heart size={16} fill="#EC4899" color="#EC4899" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}