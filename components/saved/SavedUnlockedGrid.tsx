"use client";
import { useRef } from "react";
import { MessageSquare, Image as ImageIcon } from "lucide-react";
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
  items:          UnlockedItem[];
  mode?:          "visible" | "hidden";
  onAction:       (items: UnlockedItem[]) => void;
  selectMode:     boolean;
  selectedIds:    Set<string>;
  onToggleSelect: (id: string) => void;
  onLongPress:    (id: string) => void;
  tab:            string;
  onOpenPost:     (id: string, sourceIsMessage: boolean) => void;
}

export default function SavedUnlockedGrid({ items, mode = "visible", onAction, selectMode, selectedIds, onToggleSelect, onLongPress, tab, onOpenPost }: SavedUnlockedGridProps) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePressStart = (unlockId: number) => {
    longPressTimer.current = setTimeout(() => {
      onLongPress(unlockId.toString());
    }, 500);
  };

  const handlePressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleItemClick = (item: UnlockedItem) => {
    if (selectMode) { onToggleSelect(item.unlock_id.toString()); return; }
    onOpenPost(item.id, item.source === "message");
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "2px", padding: "2px" }}>
        {items.map((item) => {
          const isSelected = selectedIds.has(item.unlock_id.toString());
          const SourceIcon = item.source === "message" ? MessageSquare : ImageIcon;

          return (
            <div
              key={item.unlock_id}
              onClick={() => handleItemClick(item)}
              onContextMenu={(e) => { e.preventDefault(); if (!selectMode) { onLongPress(item.unlock_id.toString()); } else { onToggleSelect(item.unlock_id.toString()); } }}
              onMouseDown={() => handlePressStart(item.unlock_id)}
              onMouseUp={handlePressEnd}
              onMouseLeave={handlePressEnd}
              onTouchStart={() => handlePressStart(item.unlock_id)}
              onTouchEnd={handlePressEnd}
              onTouchCancel={handlePressEnd}
              style={{
                position:               "relative",
                aspectRatio:            "1",
                backgroundColor:        "#1C1C2E",
                cursor:                 "pointer",
                overflow:               "hidden",
                outline:                isSelected ? "3px solid #8B5CF6" : "none",
                outlineOffset:          "-3px",
                transition:             "outline 0.1s",
                userSelect:             "none",
                WebkitUserSelect:       "none",
                WebkitTouchCallout:     "none",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {item.thumbnail_url ? (
                <img
                  src={item.thumbnail_url}
                  alt=""
                  loading="lazy"
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                  style={{
                    width:               "100%",
                    height:              "100%",
                    objectFit:           "cover",
                    transition:          "opacity 0.15s",
                    opacity:             selectMode && !isSelected ? 0.4 : 1,
                    pointerEvents:       "none",
                    WebkitTouchCallout:  "none",
                    WebkitUserSelect:    "none",
                    userSelect:          "none",
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