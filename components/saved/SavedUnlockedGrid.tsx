"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { EyeOff, Eye, MessageSquare, Image as ImageIcon } from "lucide-react";

export interface UnlockedItem {
  unlock_id:        number;
  source:           "post" | "message";
  id:               string;
  conversation_id?: number;
  unlocked_at:      string;
  amount_paid:      number;
  thumbnail_url:    string | null;
  media_type:       "image" | "video";
  media_count:      number;
  is_locked:        boolean;
  is_deleted:       boolean;
  creator: {
    username:   string;
    name:       string;
    avatar_url: string;
  };
}

interface SavedUnlockedGridProps {
  items:     UnlockedItem[];
  hidden:    boolean;
  onToggle:  (items: UnlockedItem[], hidden: boolean) => void;
}

export default function SavedUnlockedGrid({ items, hidden, onToggle }: SavedUnlockedGridProps) {
  const router = useRouter();
  const [selectMode,  setSelectMode]  = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [busy,        setBusy]        = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggleSelect = useCallback((unlockId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(unlockId) ? next.delete(unlockId) : next.add(unlockId);
      return next;
    });
  }, []);

  const handleCancelSelect = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const handleAction = async () => {
    if (busy || selectedIds.size === 0) return;
    setBusy(true);
    const picked = items.filter((i) => selectedIds.has(i.unlock_id));
    onToggle(picked, !hidden);
    setSelectMode(false);
    setSelectedIds(new Set());
    setBusy(false);
  };

  const handlePressStart = (unlockId: number) => {
    longPressTimer.current = setTimeout(() => {
      if (!selectMode) {
        setSelectMode(true);
        setSelectedIds(new Set([unlockId]));
      }
    }, 500);
  };

  const handlePressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleItemClick = (item: UnlockedItem) => {
    if (selectMode) { toggleSelect(item.unlock_id); return; }
    if (item.source === "message") {
      router.push(`/posts/${item.id}?source=message&from=saved`);
    } else {
      router.push(`/posts/${item.id}?from=saved`);
    }
  };

  const actionLabel = hidden ? "Unhide" : "Hide";
  const ActionIcon  = hidden ? Eye : EyeOff;

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Action bar */}
      <div style={{
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "space-between",
        padding:         "10px 16px",
        minHeight:       "44px",
        backgroundColor: selectMode ? "rgba(139,92,246,0.08)" : "transparent",
        borderBottom:    selectMode ? "1px solid rgba(139,92,246,0.2)" : "1px solid transparent",
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

            <span style={{ fontSize: "13px", fontWeight: 600, color: selectedIds.size > 0 ? "#F1F5F9" : "#6B6B8A" }}>
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Tap to select"}
            </span>

            <button
              onClick={handleAction}
              disabled={busy || selectedIds.size === 0}
              style={{
                display:         "flex",
                alignItems:      "center",
                gap:             "5px",
                padding:         "7px 14px",
                borderRadius:    "20px",
                border:          "none",
                backgroundColor: selectedIds.size > 0 ? "#8B5CF6" : "rgba(139,92,246,0.2)",
                color:           selectedIds.size > 0 ? "#FFFFFF" : "rgba(139,92,246,0.4)",
                fontSize:        "13px",
                fontWeight:      700,
                cursor:          selectedIds.size > 0 && !busy ? "pointer" : "default",
                fontFamily:      "'Inter', sans-serif",
                transition:      "all 0.15s",
              }}
            >
              <ActionIcon size={13} />
              {actionLabel}{selectedIds.size > 1 ? ` (${selectedIds.size})` : ""}
            </button>
          </>
        ) : (
          <>
            <span style={{ fontSize: "12px", color: "#4A4A6A" }}>
              {hidden ? "Hidden — hold to select" : "Hold any item to select"}
            </span>
            <button
              onClick={() => setSelectMode(true)}
              style={{
                background:      "#1C1C2E",
                border:          "1px solid #2A2A3D",
                color:           "#A3A3C2",
                fontSize:        "12px",
                fontWeight:      600,
                cursor:          "pointer",
                fontFamily:      "'Inter', sans-serif",
                padding:         "5px 12px",
                borderRadius:    "20px",
              }}
            >
              Select
            </button>
          </>
        )}
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "2px", padding: "2px" }}>
        {items.map((item) => {
          const isSelected = selectedIds.has(item.unlock_id);
          const SourceIcon = item.source === "message" ? MessageSquare : ImageIcon;

          return (
            <div
              key={item.unlock_id}
              onClick={() => handleItemClick(item)}
              onContextMenu={(e) => { e.preventDefault(); if (!selectMode) { setSelectMode(true); setSelectedIds(new Set([item.unlock_id])); } else { toggleSelect(item.unlock_id); } }}
              onMouseDown={() => handlePressStart(item.unlock_id)}
              onMouseUp={handlePressEnd}
              onMouseLeave={handlePressEnd}
              onTouchStart={() => handlePressStart(item.unlock_id)}
              onTouchEnd={handlePressEnd}
              onTouchCancel={handlePressEnd}
              style={{
                position:         "relative",
                aspectRatio:      "1",
                backgroundColor:  "#1C1C2E",
                cursor:           "pointer",
                overflow:         "hidden",
                outline:          isSelected ? "3px solid #8B5CF6" : "none",
                outlineOffset:    "-3px",
                transition:       "outline 0.1s",
                userSelect:       "none",
                WebkitUserSelect: "none",
              }}
            >
              {item.thumbnail_url ? (
                <img
                  src={item.thumbnail_url}
                  alt=""
                  loading="lazy"
                  draggable={false}
                  style={{
                    width:      "100%",
                    height:     "100%",
                    objectFit:  "cover",
                    transition: "opacity 0.15s",
                    opacity:    selectMode && !isSelected ? 0.4 : 1,
                  }}
                />
              ) : (
                <div style={{ width: "100%", height: "100%", backgroundColor: "#1C1C2E", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <SourceIcon size={20} color="#4A4A6A" />
                </div>
              )}

              {/* "Removed" badge — top-left */}
              {!selectMode && item.is_deleted && (
                <div style={{
                  position:        "absolute",
                  top:             "6px",
                  left:            "6px",
                  backgroundColor: "rgba(0,0,0,0.65)",
                  borderRadius:    "6px",
                  padding:         "2px 6px",
                  fontSize:        "10px",
                  fontWeight:      600,
                  color:           "#FFFFFF",
                  letterSpacing:   "0.02em",
                }}>
                  Removed
                </div>
              )}

              {/* Source icon — top-right when not in select mode */}
              {!selectMode && (
                <div style={{
                  position:        "absolute",
                  top:             "6px",
                  right:           "6px",
                  backgroundColor: "rgba(0,0,0,0.55)",
                  borderRadius:    "6px",
                  padding:         "3px 5px",
                  display:         "flex",
                  alignItems:      "center",
                  justifyContent:  "center",
                }}>
                  <SourceIcon size={11} color="#FFFFFF" strokeWidth={2.2} />
                </div>
              )}

              {/* Selection checkbox */}
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

              {/* Media count badge — bottom-left when multi */}
              {!selectMode && item.media_count > 1 && (
                <div style={{ position: "absolute", bottom: "6px", left: "6px", backgroundColor: "rgba(0,0,0,0.6)", borderRadius: "6px", padding: "2px 6px" }}>
                  <span style={{ fontSize: "11px", color: "#FFFFFF", fontWeight: 600 }}>1/{item.media_count}</span>
                </div>
              )}

              {/* Media-type icon — bottom-right */}
              {!selectMode && (
                <div style={{ position: "absolute", bottom: "6px", right: "6px" }}>
                  {item.media_type === "video"
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