"use client";

import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { Users, BadgeCheck, UserPlus, Trash2 } from "lucide-react";

export interface SavedCreator {
  id:              string;
  username:        string;
  name:            string;
  avatar_url:      string;
  banner_url:      string | null;
  isVerified:      boolean;
  subscriberCount: number;
  follower_count:  number;
  likes_count:     number;
  isSubscribed:    boolean;
  is_free?:        boolean;
}

interface SavedCreatorGridProps {
  creators: SavedCreator[];
  onUnsave: (id: string) => void;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

const FALLBACK_COVER = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80";

function CreatorCard({ creator, onUnsave, selectMode, isSelected, onToggle }: { creator: SavedCreator; onUnsave: (id: string) => void; selectMode: boolean; isSelected: boolean; onToggle: (id: string) => void }) {

  const router = useRouter();
  const [hovered,    setHovered]    = useState(false);
  const [showUnsave, setShowUnsave] = useState(false);
  const longPressTimer              = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePressStart = () => {
    longPressTimer.current = setTimeout(() => {
      if (selectMode) { onToggle(creator.id); } else { setShowUnsave(true); }
    }, 500);
  };
  const handlePressEnd = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  };
  const handleClick = () => {
    if (selectMode) { onToggle(creator.id); return; }
    if (showUnsave) { setShowUnsave(false); return; }
    router.push(`/${creator.username}`);
  };

  return (
    <div
      onClick={handleClick}
      onContextMenu={(e) => { e.preventDefault(); setShowUnsave(true); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setShowUnsave(false); }}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
      onTouchCancel={handlePressEnd}
      style={{
        position:         "relative",
        width:            "100%",
        height:           "200px",
        borderRadius:     "12px",
        overflow:         "hidden",
        cursor:           "pointer",
        backgroundColor:  "#1A1A2E",
        border:           `1px solid ${isSelected ? "#8B5CF6" : hovered ? "#8B5CF6" : "#2A2A3D"}`,
        outline:          isSelected ? "3px solid #8B5CF6" : "none",
        outlineOffset:    "-3px",
        transition:       "border-color 0.15s ease",
        userSelect:       "none",
        WebkitUserSelect: "none",
      }}
    >
      {/* Banner */}
            <img src={creator.banner_url || FALLBACK_COVER} alt="" loading="lazy" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: selectMode && !isSelected ? 0.4 : 1, transition: "opacity 0.15s" }} />

      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0) 25%, rgba(0,0,0,0.92) 100%)" }} />

      {/* Avatar — 56px matching MobileCreatorCard */}
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -55%)", zIndex: 2 }}>
        <div style={{ width: "56px", height: "56px", borderRadius: "50%", padding: "2px", background: "conic-gradient(#C45F8C, #8B3FBF, #C45F8C)" }}>
          <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", border: "2px solid #0A0A0F" }}>
            <img src={creator.avatar_url || ""} alt={creator.name} loading="lazy" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>
        </div>
      </div>

      {/* Name + username */}
      <div style={{ position: "absolute", bottom: "36px", left: 0, right: 0, zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", padding: "0 10px", gap: "3px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "110px", fontFamily: "'Inter', sans-serif" }}>
            {creator.name}
          </span>
          {creator.isVerified && <BadgeCheck size={12} color="#A78BFA" />}
        </div>
        <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", fontFamily: "'Inter', sans-serif" }}>@{creator.username}</span>
      </div>

      {/* Stats row — below name, matching MobileCreatorCard */}
      <div style={{ position: "absolute", bottom: "12px", left: 0, right: 0, zIndex: 2, display: "flex", justifyContent: "center", gap: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="rgba(250,192,50,0.15)" stroke="#F5C842" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 18h20"/><path d="M4 18L2 8l4.5 4L12 4l5.5 8L22 8l-2 10H4z"/>
            <circle cx="12" cy="4" r="1.2" fill="#F5C842" stroke="none"/>
            <circle cx="6.5" cy="12" r="1" fill="rgba(245,200,66,0.7)" stroke="none"/>
            <circle cx="17.5" cy="12" r="1" fill="rgba(245,200,66,0.7)" stroke="none"/>
          </svg>
          <span style={{ fontSize: "12px", color: "#F5C842", fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>{formatCount(creator.subscriberCount ?? 0)}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <UserPlus size={14} color="#60A5FA" strokeWidth={1.8} />
          <span style={{ fontSize: "12px", color: "#60A5FA", fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>{formatCount(creator.follower_count ?? 0)}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.9)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.85)", fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>{formatCount(creator.likes_count ?? 0)}</span>
        </div>
      </div>

      {selectMode && (
        <div style={{
          position: "absolute", top: "6px", right: "6px", width: "24px", height: "24px",
          borderRadius: "50%", backgroundColor: isSelected ? "#8B5CF6" : "rgba(0,0,0,0.55)",
          border: `2.5px solid ${isSelected ? "#8B5CF6" : "rgba(255,255,255,0.8)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.15s", boxShadow: "0 1px 4px rgba(0,0,0,0.4)", zIndex: 10,
        }}>
          {isSelected && (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
      )}

      {/* Long press unsave overlay */}
      {showUnsave && (
        <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, backdropFilter: "blur(2px)" }}>
          <button
            onClick={(e) => { e.stopPropagation(); onUnsave(creator.id); }}
            style={{ padding: "10px 20px", borderRadius: "20px", border: "none", backgroundColor: "#EF4444", color: "#FFFFFF", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
          >
            Remove from saved
          </button>
        </div>
      )}
    </div>
  );
}

export default function SavedCreatorGrid({ creators, onUnsave }: SavedCreatorGridProps) {
  const [selectMode,  setSelectMode]  = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [removing,    setRemoving]    = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };
  const handleCancelSelect = () => { setSelectMode(false); setSelectedIds(new Set()); };
  const handleRemoveSelected = () => {
    if (removing || selectedIds.size === 0) return;
    setRemoving(true);
    selectedIds.forEach((id) => onUnsave(id));
    setSelectMode(false); setSelectedIds(new Set()); setRemoving(false);
  };
  if (!creators.length) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px", gap: "12px" }}>
        <div style={{ width: "56px", height: "56px", borderRadius: "16px", backgroundColor: "#1C1C2E", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Users size={24} color="#6B6B8A" strokeWidth={1.6} />
        </div>
        <p style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#C4C4D4", fontFamily: "'Inter', sans-serif" }}>No saved creators yet</p>
        <p style={{ margin: 0, fontSize: "13px", color: "#6B6B8A", textAlign: "center", maxWidth: "220px", lineHeight: 1.6, fontFamily: "'Inter', sans-serif" }}>
          Save creators from their profile or from any post
        </p>
      </div>
    );
  }

  return (
    <>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 16px", minHeight: "44px",
        backgroundColor: selectMode ? "rgba(239,68,68,0.08)" : "transparent",
        borderBottom: selectMode ? "1px solid rgba(239,68,68,0.2)" : "1px solid transparent",
        transition: "background-color 0.2s ease, border-color 0.2s ease",
      }}>
        {selectMode ? (
          <>
            <button onClick={handleCancelSelect} style={{ background: "none", border: "none", color: "#A3A3C2", fontSize: "14px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif", padding: "6px 0" }}>Cancel</button>
            <span style={{ fontSize: "13px", fontWeight: 600, color: selectedIds.size > 0 ? "#F1F5F9" : "#6B6B8A", fontFamily: "'Inter', sans-serif" }}>
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Tap to select"}
            </span>
            <button onClick={handleRemoveSelected} disabled={removing || selectedIds.size === 0} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "7px 14px", borderRadius: "20px", border: "none", backgroundColor: selectedIds.size > 0 ? "#EF4444" : "rgba(239,68,68,0.2)", color: selectedIds.size > 0 ? "#FFFFFF" : "rgba(239,68,68,0.4)", fontSize: "13px", fontWeight: 700, cursor: selectedIds.size > 0 && !removing ? "pointer" : "default", fontFamily: "'Inter', sans-serif" }}>
              <Trash2 size={13} />
              Remove{selectedIds.size > 1 ? ` (${selectedIds.size})` : ""}
            </button>
          </>
        ) : (
          <>
            <span style={{ fontSize: "12px", color: "#4A4A6A", fontFamily: "'Inter', sans-serif" }}>Hold any creator to select</span>
            <button onClick={() => setSelectMode(true)} style={{ background: "none", border: "1px solid #2A2A3D", color: "#A3A3C2", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif", padding: "5px 12px", borderRadius: "20px", backgroundColor: "#1C1C2E" }}>Select</button>
          </>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px", padding: "0 8px 8px" }}>
        {creators.map((creator) => (
          <CreatorCard key={creator.id} creator={creator} onUnsave={onUnsave} selectMode={selectMode} isSelected={selectedIds.has(creator.id)} onToggle={toggleSelect} />
        ))}
      </div>
    </>
  );
}