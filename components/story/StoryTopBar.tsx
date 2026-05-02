"use client";

import { forwardRef, useImperativeHandle, useRef, useCallback, useEffect } from "react";
import { X, MoreVertical, Trash2, Volume2, VolumeX } from "lucide-react";
import type { CreatorStoryGroup, StoryItem } from "@/components/story/StoryBar";

const IMAGE_DURATION_MS = 5000;

const ICON_BTN: React.CSSProperties = {
  background: "rgba(0,0,0,0.45)", border: "none", borderRadius: "50%",
  width: 34, height: 34, display: "flex", alignItems: "center",
  justifyContent: "center", cursor: "pointer", color: "#fff", flexShrink: 0,
};

const stop = {
  onTouchStart: (e: any) => e.stopPropagation(),
  onTouchEnd:   (e: any) => e.stopPropagation(),
  onMouseDown:  (e: any) => e.stopPropagation(),
  onMouseUp:    (e: any) => e.stopPropagation(),
};

function Avatar({ src, name, size = 36 }: { src: string | null; name: string; size?: number }) {
  const colors = ["#8B5CF6","#EC4899","#F59E0B","#10B981","#3B82F6","#EF4444"];
  const bg = colors[(name.charCodeAt(0) ?? 0) % colors.length];
  if (src) return <img src={src} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", display: "block", border: "2px solid rgba(255,255,255,0.3)" }} />;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block", flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={size/2} fill={bg} />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fill="#fff" fontSize={size*0.4} fontFamily="Inter,sans-serif" fontWeight="700">{(name[0]??"?").toUpperCase()}</text>
    </svg>
  );
}

function timeAgo(d: string): string {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h/24)}d ago`;
}

export interface StoryTopBarRef {
  resetBars:      (currentIdx: number) => void;
  startImageBar:  (idx: number, paused: boolean) => void;
  pauseBar:       (idx: number) => void;
  resumeBar:      (idx: number) => void;
  setVideoBarPct: (pct: number, idx: number) => void;
}

interface Props {
  group:         CreatorStoryGroup;
  story:         StoryItem;
  storyIdx:      number;
  isOwner:       boolean;
  isVideo:       boolean;
  muted:         boolean;
  deleting:      boolean;
  menuOpen:      boolean;
  onMuteToggle:  () => void;
  onMenuToggle:  () => void;
  onDelete:      () => void;
  onClose:       () => void;
  onBarComplete: () => void;
  onTip?:        () => void;
}

export default forwardRef<StoryTopBarRef, Props>(function StoryTopBar(
  { group, story, storyIdx, isOwner, isVideo, muted, deleting, menuOpen, onMuteToggle, onMenuToggle, onDelete, onClose, onBarComplete, onTip },
  ref,
) {
  const barsRef = useRef<HTMLDivElement>(null);

  const getFill = useCallback(
    (idx: number) => barsRef.current?.querySelector<HTMLDivElement>(`[data-fill="${idx}"]`),
    [],
  );

  useImperativeHandle(ref, () => ({
    resetBars(currentIdx: number) {
      barsRef.current?.querySelectorAll<HTMLDivElement>("[data-fill]").forEach((el) => {
        const i = Number(el.dataset.fill);
        el.style.transition = el.style.animation = "none";
        el.style.transform = i < currentIdx ? "scaleX(1)" : "scaleX(0)";
      });
    },
    startImageBar(idx: number, paused: boolean) {
      const el = getFill(idx);
      if (!el) return;
      el.style.transition = el.style.animation = "none";
      el.style.transform = "scaleX(0)";
      void el.offsetHeight;
      el.style.animation = `sv-progress ${IMAGE_DURATION_MS}ms linear forwards`;
      el.style.animationPlayState = paused ? "paused" : "running";
    },
    pauseBar(idx: number) {
      const f = getFill(idx);
      if (f) f.style.animationPlayState = "paused";
    },
    resumeBar(idx: number) {
      const f = getFill(idx);
      if (f) f.style.animationPlayState = "running";
    },
    setVideoBarPct(pct: number, idx: number) {
      const el = getFill(idx);
      if (!el) return;
      el.style.animation = el.style.transition = "none";
      el.style.transform = `scaleX(${pct})`;
    },
  }), [getFill]);

  useEffect(() => {
    const c = barsRef.current;
    if (!c) return;
    const handler = (e: AnimationEvent) => { if (e.animationName === "sv-progress") onBarComplete(); };
    c.addEventListener("animationend", handler);
    return () => c.removeEventListener("animationend", handler);
  }, [onBarComplete]);

  return (
    <>
      <style>{`@keyframes sv-progress{from{transform:scaleX(0)}to{transform:scaleX(1)}}`}</style>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "calc(env(safe-area-inset-top) + 12px) 12px 0", background: "linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, transparent 100%)", zIndex: 10, pointerEvents: "auto" }}>

        <div ref={barsRef} style={{ display: "flex", gap: 3, marginBottom: 10 }}>
          {group.items.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 2, borderRadius: 2, background: "rgba(255,255,255,0.3)", overflow: "hidden" }}>
              <div data-fill={String(i)} style={{ height: "100%", background: "#fff", borderRadius: 2, transformOrigin: "left", willChange: "transform", transform: i < storyIdx ? "scaleX(1)" : "scaleX(0)" }} />
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 12 }}>
          <a href={`/${group.username}`} onClick={(e) => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", flex: 1, minWidth: 0 }}>
            <Avatar src={group.avatarUrl} name={group.displayName} size={36} />
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: "Inter,sans-serif", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{group.displayName}</p>
              <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.6)", fontFamily: "Inter,sans-serif" }}>{timeAgo(story.createdAt)}</p>
            </div>
          </a>
          {(() => { console.log("[TopBar] id:", story.id, "isMuted:", story.isMuted); return null; })()}
          {isVideo && !story.isMuted && (
            <button {...stop} onClick={(e) => { e.stopPropagation(); onMuteToggle(); }} style={ICON_BTN}>
              {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
          )}
          {!isOwner && onTip && (
            <button {...stop} onClick={(e) => { e.stopPropagation(); onTip(); }} style={ICON_BTN} title="Send a tip">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/>
                <line x1="12" y1="22" x2="12" y2="7"/>
                <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
                <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
              </svg>
            </button>
          )}
          {isOwner && (
            <div style={{ position: "relative" }}>
              <button {...stop} onClick={(e) => { e.stopPropagation(); onMenuToggle(); }} style={ICON_BTN}>
                <MoreVertical size={15} />
              </button>
              {menuOpen && (
                <div onTouchStart={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
                  style={{ position: "absolute", top: 38, right: 0, background: "#13131F", border: "1px solid #2A2A3D", borderRadius: 10, minWidth: 150, boxShadow: "0 8px 24px rgba(0,0,0,0.6)", zIndex: 10, overflow: "hidden" }}>
                  <button onClick={(e) => { e.stopPropagation(); onDelete(); }} disabled={deleting}
                    style={{ width: "100%", padding: "11px 16px", background: "none", border: "none", cursor: deleting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 10, color: "#F87171", fontSize: 13, fontFamily: "Inter,sans-serif", fontWeight: 600 }}>
                    <Trash2 size={14} />{deleting ? "Deleting…" : "Delete Story"}
                  </button>
                </div>
              )}
            </div>
          )}
          <button {...stop} onClick={(e) => { e.stopPropagation(); onClose(); }} style={ICON_BTN}>
            <X size={15} />
          </button>
        </div>
      </div>
    </>
  );
});