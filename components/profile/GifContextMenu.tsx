"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Star, Reply } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface GifContextMenuProps {
  gifUrl: string;
  postId: string;
  commentId: string | number;
  onReply: () => void;
  children: React.ReactNode;
}

interface MenuPosition {
  x: number;
  y: number;
}

// ── Inject global styles once ─────────────────────────────────────────────────
const STYLE_ID = "gif-ctx-styles";
function injectStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes gifCtxBackdropIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes gifCtxMenuIn {
      from { opacity: 0; transform: scale(0.82) translateY(6px); }
      to   { opacity: 1; transform: scale(1)    translateY(0); }
    }
    @keyframes gifCtxMenuOut {
      from { opacity: 1; transform: scale(1)    translateY(0); }
      to   { opacity: 0; transform: scale(0.88) translateY(4px); }
    }
    @keyframes gifCtxPreviewIn {
      from { opacity: 0; transform: scale(0.9); }
      to   { opacity: 1; transform: scale(1); }
    }
    @keyframes gifCtxPressRing {
      0%   { box-shadow: 0 0 0 0px rgba(139,92,246,0.55); }
      60%  { box-shadow: 0 0 0 8px rgba(139,92,246,0.18); }
      100% { box-shadow: 0 0 0 12px rgba(139,92,246,0); }
    }
    .gif-ctx-trigger {
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
      touch-action: none;
    }
    .gif-ctx-trigger.pressing {
      animation: gifCtxPressRing 0.5s ease forwards;
    }
    .gif-ctx-trigger img {
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);
}

// ── Long-press hook ───────────────────────────────────────────────────────────
function useLongPress(
  onLongPress: (x: number, y: number) => void,
  threshold = 500
) {
  const timerRef   = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPos   = React.useRef<{ x: number; y: number } | null>(null);
  const fired      = React.useRef(false);
  const MOVE_LIMIT = 10; // px — cancel if finger drifts

  const cancel = React.useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    startPos.current = null;
    fired.current    = false;
  }, []);

  const onTouchStart = React.useCallback(
    (e: React.TouchEvent) => {
      // prevent iOS long-press callout / text selection
      e.preventDefault();
      fired.current = false;
      const t = e.touches[0];
      startPos.current = { x: t.clientX, y: t.clientY };
      timerRef.current = setTimeout(() => {
        if (!startPos.current) return;
        fired.current = true;
        // vibrate on Android (silent fail on iOS)
        try { navigator.vibrate?.(30); } catch {}
        onLongPress(startPos.current.x, startPos.current.y);
        startPos.current = null;
      }, threshold);
    },
    [onLongPress, threshold]
  );

  const onTouchMove = React.useCallback(
    (e: React.TouchEvent) => {
      if (!startPos.current || fired.current) return;
      const t  = e.touches[0];
      const dx = Math.abs(t.clientX - startPos.current.x);
      const dy = Math.abs(t.clientY - startPos.current.y);
      if (dx > MOVE_LIMIT || dy > MOVE_LIMIT) cancel();
    },
    [cancel]
  );

  const onTouchEnd = React.useCallback(
    (e: React.TouchEvent) => {
      // if fired already, swallow the click so it doesn't re-trigger
      if (fired.current) e.preventDefault();
      cancel();
    },
    [cancel]
  );

  // Desktop: right-click
  const onContextMenu = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onLongPress(e.clientX, e.clientY);
    },
    [onLongPress]
  );

  return { onTouchStart, onTouchMove, onTouchEnd, onContextMenu };
}

// ── Smart position — keeps menu on-screen ────────────────────────────────────
function resolvePosition(
  rawX: number,
  rawY: number,
  menuW = 190,
  menuH = 140
): MenuPosition {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let x = rawX;
  let y = rawY + 12; // slight offset below finger
  if (x + menuW > vw - 12) x = vw - menuW - 12;
  if (x < 12) x = 12;
  if (y + menuH > vh - 12) y = rawY - menuH - 12;
  if (y < 12) y = 12;
  return { x, y };
}

// ── Main component ────────────────────────────────────────────────────────────
export function GifContextMenu({
  gifUrl,
  postId,
  commentId,
  onReply,
  children,
}: GifContextMenuProps) {
  injectStyles();

  const [open,     setOpen]     = React.useState(false);
  const [pos,      setPos]      = React.useState<MenuPosition>({ x: 0, y: 0 });
  const [pressing, setPressing] = React.useState(false);
  const [closing,  setClosing]  = React.useState(false);
  const [saving,   setSaving]   = React.useState(false);
  const [saved,    setSaved]    = React.useState(false);

  const show = React.useCallback((rawX: number, rawY: number) => {
    setPressing(false);
    setPos(resolvePosition(rawX, rawY));
    setClosing(false);
    setOpen(true);
  }, []);

  const hide = React.useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 160);
  }, []);

  const longPressProps = useLongPress(show, 480);

  // show press-ring feedback on touchstart
  const handleTouchStart = React.useCallback(
    (e: React.TouchEvent) => {
      setPressing(true);
      longPressProps.onTouchStart(e);
    },
    [longPressProps]
  );
  const handleTouchEnd = React.useCallback(
    (e: React.TouchEvent) => {
      setPressing(false);
      longPressProps.onTouchEnd(e);
    },
    [longPressProps]
  );
  const handleTouchMove = React.useCallback(
    (e: React.TouchEvent) => {
      setPressing(false);
      longPressProps.onTouchMove(e);
    },
    [longPressProps]
  );

  const handleSave = async () => {
    if (saving || saved) return;
    setSaving(true);
    try {
      await fetch("/api/gifs/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gif_id:      gifUrl,
          gif_url:     gifUrl,
          preview_url: gifUrl,
          title:       "",
        }),
      });
      setSaved(true);
    } catch {}
    finally { setSaving(false); }
    hide();
  };

  const handleReply = () => {
    onReply();
    hide();
  };

  return (
    <>
      {/* Trigger wrapper */}
      <div
        className={`gif-ctx-trigger${pressing ? " pressing" : ""}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onContextMenu={longPressProps.onContextMenu}
        style={{ display: "inline-block", position: "relative" }}
      >
        {children}
      </div>

      {/* Portal menu */}
      {open && typeof document !== "undefined" &&
        createPortal(
          <div
            style={{
              position:  "fixed",
              inset:     0,
              zIndex:    99999,
              animation: "gifCtxBackdropIn 0.18s ease forwards",
            }}
            onPointerDown={(e) => {
              if (e.target === e.currentTarget) hide();
            }}
          >
            {/* Blurred dim backdrop */}
            <div
              onClick={hide}
              style={{
                position:       "absolute",
                inset:          0,
                backgroundColor:"rgba(0,0,0,0.52)",
                backdropFilter: "blur(6px)",
                WebkitBackdropFilter: "blur(6px)",
              }}
            />

            {/* GIF preview floating above menu */}
            <div
              style={{
                position:  "absolute",
                left:      pos.x,
                top:       Math.max(12, pos.y - 116),
                zIndex:    1,
                animation: "gifCtxPreviewIn 0.22s cubic-bezier(0.34,1.56,0.64,1) forwards",
                pointerEvents: "none",
              }}
            >
              <img
                src={gifUrl}
                alt="GIF preview"
                style={{
                  width:        "160px",
                  borderRadius: "12px",
                  display:      "block",
                  boxShadow:    "0 8px 32px rgba(0,0,0,0.6)",
                  border:       "1.5px solid rgba(139,92,246,0.3)",
                }}
              />
            </div>

            {/* Context menu */}
            <div
              style={{
                position:        "absolute",
                left:            pos.x,
                top:             pos.y,
                minWidth:        "190px",
                backgroundColor: "#16162A",
                border:          "1px solid rgba(139,92,246,0.25)",
                borderRadius:    "14px",
                overflow:        "hidden",
                boxShadow:       "0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
                animation:       closing
                  ? "gifCtxMenuOut 0.16s cubic-bezier(0.4,0,1,1) forwards"
                  : "gifCtxMenuIn  0.22s cubic-bezier(0.34,1.56,0.64,1) forwards",
                zIndex: 2,
              }}
            >
              {/* Save GIF */}
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  width:           "100%",
                  padding:         "13px 16px",
                  border:          "none",
                  borderBottom:    "1px solid rgba(255,255,255,0.06)",
                  backgroundColor: "transparent",
                  color:           saved ? "#FACC15" : "#E2E8F0",
                  fontSize:        "14px",
                  fontWeight:      600,
                  fontFamily:      "'Inter', sans-serif",
                  textAlign:       "left",
                  cursor:          saving ? "default" : "pointer",
                  display:         "flex",
                  alignItems:      "center",
                  gap:             "10px",
                  opacity:         saving ? 0.6 : 1,
                  transition:      "background 0.12s, color 0.15s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "rgba(250,204,21,0.08)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                <Star
                  size={15}
                  fill={saved ? "#FACC15" : "none"}
                  color={saved ? "#FACC15" : "#FACC15"}
                  strokeWidth={2}
                />
                {saving ? "Saving…" : saved ? "Saved!" : "Save GIF"}
              </button>

              {/* Reply */}
              <button
                onClick={handleReply}
                style={{
                  width:           "100%",
                  padding:         "13px 16px",
                  border:          "none",
                  backgroundColor: "transparent",
                  color:           "#E2E8F0",
                  fontSize:        "14px",
                  fontWeight:      600,
                  fontFamily:      "'Inter', sans-serif",
                  textAlign:       "left",
                  cursor:          "pointer",
                  display:         "flex",
                  alignItems:      "center",
                  gap:             "10px",
                  transition:      "background 0.12s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "rgba(139,92,246,0.1)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                <Reply size={15} color="#8B5CF6" strokeWidth={2} />
                Reply
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}