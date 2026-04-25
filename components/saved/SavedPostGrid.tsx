"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, Lock, Trash2 } from "lucide-react";

export interface SavedPost {
  id:            string;
  thumbnail_url: string | null;
  media_type:    "image" | "video";
  media_count?:  number;
  is_locked:     boolean;
  creator: {
    username:   string;
    name:       string;
    avatar_url: string;
  };
}

interface SavedPostGridProps {
  posts:    SavedPost[];
  onUnsave: (ids: string[]) => void;
}

export default function SavedPostGrid({ posts, onUnsave }: SavedPostGridProps) {
  const router = useRouter();
  const [selectMode,  setSelectMode]  = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [removing,    setRemoving]    = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleCancelSelect = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const handleRemoveSelected = async () => {
    if (removing || selectedIds.size === 0) return;
    setRemoving(true);
    const ids = Array.from(selectedIds);
    onUnsave(ids);
    setSelectMode(false);
    setSelectedIds(new Set());
    setRemoving(false);
  };

  // Long press handlers
  const handlePressStart = (id: string) => {
    longPressTimer.current = setTimeout(() => {
      if (!selectMode) {
        setSelectMode(true);
        setSelectedIds(new Set([id]));
      }
    }, 500);
  };

  const handlePressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleItemClick = (id: string) => {
    if (selectMode) { toggleSelect(id); return; }
    router.push(`/posts/${id}?from=saved`);
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Action bar — always visible at top, transforms in select mode */}
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
              onClick={handleCancelSelect}
              style={{ background: "none", border: "none", color: "#A3A3C2", fontSize: "14px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif", padding: "6px 0" }}
            >
              Cancel
            </button>

            <span style={{ fontSize: "13px", fontWeight: 600, color: selectedIds.size > 0 ? "#F1F5F9" : "#6B6B8A", fontFamily: "'Inter', sans-serif" }}>
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Tap to select"}
            </span>

            <button
              onClick={handleRemoveSelected}
              disabled={removing || selectedIds.size === 0}
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
                cursor:          selectedIds.size > 0 && !removing ? "pointer" : "default",
                fontFamily:      "'Inter', sans-serif",
                transition:      "all 0.15s",
              }}
            >
              <Trash2 size={13} />
              Remove{selectedIds.size > 1 ? ` (${selectedIds.size})` : ""}
            </button>
          </>
        ) : (
          <>
            <span style={{ fontSize: "12px", color: "#4A4A6A", fontFamily: "'Inter', sans-serif" }}>
              Hold any post to select
            </span>
            <button
              onClick={() => setSelectMode(true)}
              style={{
                background:      "none",
                border:          "1px solid #2A2A3D",
                color:           "#A3A3C2",
                fontSize:        "12px",
                fontWeight:      600,
                cursor:          "pointer",
                fontFamily:      "'Inter', sans-serif",
                padding:         "5px 12px",
                borderRadius:    "20px",
                backgroundColor: "#1C1C2E",
              }}
            >
              Select
            </button>
          </>
        )}
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "2px", padding: "2px" }}>
        {posts.map((post) => {
          const isSelected = selectedIds.has(post.id);
          return (
            <div
              key={post.id}
              onClick={() => handleItemClick(post.id)}
              onContextMenu={(e) => { e.preventDefault(); if (!selectMode) { setSelectMode(true); setSelectedIds(new Set([post.id])); } else { toggleSelect(post.id); } }}
              onMouseDown={() => handlePressStart(post.id)}
              onMouseUp={handlePressEnd}
              onMouseLeave={handlePressEnd}
              onTouchStart={() => handlePressStart(post.id)}
              onTouchEnd={handlePressEnd}
              onTouchCancel={handlePressEnd}
              style={{
                position:    "relative",
                aspectRatio: "1",
                backgroundColor: "#1C1C2E",
                cursor:      "pointer",
                overflow:    "hidden",
                outline:     isSelected ? "3px solid #8B5CF6" : "none",
                outlineOffset: "-3px",
                transition:  "outline 0.1s",
                userSelect:  "none",
                WebkitUserSelect: "none",
              }}
            >
              {post.thumbnail_url ? (
                <img
                  src={post.thumbnail_url}
                  alt=""
                  loading="lazy"
                  draggable={false}
                  style={{
                    width:      "100%",
                    height:     "100%",
                    objectFit:  "cover",
                    transition: "opacity 0.15s",
                    opacity:    selectMode && !isSelected ? 0.4 : 1,
                    filter:     post.is_locked && !selectMode ? "blur(12px)" : "none",
                  }}
                />
              ) : (
                <div style={{ width: "100%", height: "100%", backgroundColor: "#1C1C2E", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Bookmark size={20} color="#4A4A6A" />
                </div>
              )}

              {/* Lock overlay */}
              {post.is_locked && !selectMode && (
                <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Lock size={16} color="#fff" />
                </div>
              )}

              {/* Checkbox — top right, always in select mode */}
              {selectMode && (
                <div style={{
                  position:        "absolute",
                  top:             "6px",
                  right:           "6px",
                  width:           "24px",
                  height:          "24px",
                  borderRadius:    "50%",
                  backgroundColor: isSelected ? "#8B5CF6" : "rgba(0,0,0,0.55)",
                  border:          `2.5px solid ${isSelected ? "#8B5CF6" : "rgba(255,255,255,0.8)"}`,
                  display:         "flex",
                  alignItems:      "center",
                  justifyContent:  "center",
                  transition:      "all 0.15s",
                  boxShadow:       "0 1px 4px rgba(0,0,0,0.4)",
                }}>
                  {isSelected && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              )}

              {/* Media count badge */}
              {!selectMode && post.media_count && post.media_count > 1 && (
                <div style={{ position: "absolute", top: "6px", right: "6px", backgroundColor: "rgba(0,0,0,0.6)", borderRadius: "6px", padding: "2px 6px" }}>
                  <span style={{ fontSize: "11px", color: "#FFFFFF", fontWeight: 600 }}>1/{post.media_count}</span>
                </div>
              )}

              {/* Media type icon */}
              {!selectMode && (
                <div style={{ position: "absolute", bottom: "6px", right: "6px" }}>
                  {post.media_type === "video"
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="white" opacity={0.9}><polygon points="5,3 19,12 5,21" /></svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" opacity={0.9}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>
                  }
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}