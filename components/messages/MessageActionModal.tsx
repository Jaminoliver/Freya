"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Copy, CornerUpLeft, Trash2, CheckSquare, Bookmark, Plus } from "lucide-react";
import dynamic from "next/dynamic";
import type { Message } from "@/lib/types/messages";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

const DEFAULT_EMOJIS    = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
const FREQUENTS_KEY     = "freya:emoji-frequents";
const FREQUENTS_LIMIT   = 6;

function getFrequentEmojis(): string[] {
  if (typeof window === "undefined") return DEFAULT_EMOJIS;
  try {
    const raw    = localStorage.getItem(FREQUENTS_KEY);
    const counts: Record<string, number> = raw ? JSON.parse(raw) : {};
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([e]) => e);
    const result = [...sorted];
    for (const e of DEFAULT_EMOJIS) {
      if (result.length >= FREQUENTS_LIMIT) break;
      if (!result.includes(e)) result.push(e);
    }
    return result.slice(0, FREQUENTS_LIMIT);
  } catch { return DEFAULT_EMOJIS; }
}

function trackEmojiUse(emoji: string) {
  if (typeof window === "undefined") return;
  try {
    const raw    = localStorage.getItem(FREQUENTS_KEY);
    const counts: Record<string, number> = raw ? JSON.parse(raw) : {};
    counts[emoji] = (counts[emoji] || 0) + 1;
    localStorage.setItem(FREQUENTS_KEY, JSON.stringify(counts));
  } catch {}
}

interface Props {
  message:             Message;
  isOwn:               boolean;
  bubbleRect?:         DOMRect | null;
  onCopy:              () => void;
  onReply:             () => void;
  onDeleteForMe:       () => void;
  onDeleteForEveryone: () => void;
  onSelect?:           (messageId: number) => void;
  onSaveGif?:          () => void;
  onReact?:            (emoji: string) => void;
  onClose:             () => void;
}

export function MessageActionModal({
  message, isOwn, bubbleRect,
  onCopy, onReply, onDeleteForMe, onDeleteForEveryone, onSelect, onSaveGif, onReact, onClose,
}: Props) {
  const [closing,        setClosing]        = useState(false);
  const [ready,          setReady]          = useState(false);
  const [tappedEmoji,    setTappedEmoji]    = useState<string | null>(null);
  const [showFullPicker, setShowFullPicker] = useState(false);
  const [reactionEmojis] = useState<string[]>(() => getFrequentEmojis());
  const [panelRect,      setPanelRect]      = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  // ── Compute anchored position from bubbleRect ──────────────────────────────
  const PAD        = 10;
  const MODAL_W    = 260;
  const TRAY_H     = 60;   // emoji tray approx height
  const PREVIEW_H  = 56;   // preview bubble approx height
  const ITEM_H     = 38;
  const menuCount  = 4 + (onSaveGif ? 1 : 0) + (isOwn ? 1 : 0); // rough item count
  const LIST_H     = menuCount * ITEM_H + 20;
  const STACK_H    = TRAY_H + 10 + PREVIEW_H + 10 + LIST_H;

  const vw = typeof window !== "undefined" ? window.innerWidth  : 390;
  const vh = typeof window !== "undefined" ? window.innerHeight : 844;

  console.log("[MAM] viewport:", { vw, vh });
  console.log("[MAM] bubbleRect:", bubbleRect ? { top: bubbleRect.top, bottom: bubbleRect.bottom, left: bubbleRect.left, right: bubbleRect.right } : null);
  console.log("[MAM] isOwn:", isOwn, "MODAL_W:", MODAL_W, "STACK_H:", STACK_H);

  // Horizontal: left-aligned for received, right-aligned for sent
  let anchorLeft: number | undefined;
  let anchorRight: number | undefined;
  if (bubbleRect) {
    if (isOwn) {
      anchorRight = vw - bubbleRect.right;
      anchorRight = Math.max(PAD, Math.min(anchorRight, vw - MODAL_W - PAD));
    } else {
      anchorLeft = bubbleRect.left;
      anchorLeft = Math.max(PAD, Math.min(anchorLeft, vw - MODAL_W - PAD));
    }
  }

  // Vertical: center the stack on screen (like WhatsApp)
  let anchorTop: number | undefined;
  if (bubbleRect) {
    anchorTop = Math.max(PAD, (vh - STACK_H) / 2);
  }

  console.log("[MAM] computed:", { anchorLeft, anchorRight, anchorTop });

  // ── Dismiss iOS keyboard on mount, then allow interaction ──────────────────
  useEffect(() => {
    // Blur any focused input to drop the keyboard on iOS
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    // Short delay so keyboard animates away before we accept taps
    const t = setTimeout(() => setReady(true), 320);
    return () => clearTimeout(t);
  }, []);

  const triggerClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => { setClosing(false); onClose(); }, 260);
  }, [onClose]);

  // Escape key
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") triggerClose(); };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [triggerClose]);

  // Constrain backdrop + picker overlay to chat panel on desktop
  useEffect(() => {
    const isDesktop = window.innerWidth >= 768;
    if (!isDesktop) { setPanelRect(null); return; }
    const panel = document.querySelector(".chat-panel-root") as HTMLElement | null;
    if (!panel) { setPanelRect(null); return; }
    const rect = panel.getBoundingClientRect();
    setPanelRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
  }, []);

  const handleReact = (emoji: string) => {
    setTappedEmoji(emoji);
    trackEmojiUse(emoji);
    setTimeout(() => { onReact?.(emoji); triggerClose(); }, 390);
  };

  const myReaction = (message.reactions ?? []).find((r) => r.reactedByMe)?.emoji ?? null;

  const previewText =
    message.text ??
    (message.type === "media" ? "📷 Photo"  :
     message.type === "gif"   ? "🎞️ GIF"   :
     message.type === "ppv"   ? "🔒 PPV"    : "Message");

  const menuItems: {
    icon:   React.ReactNode;
    label:  string;
    danger: boolean;
    action: () => void;
  }[] = [
    ...(onSaveGif ? [{
      icon: <Bookmark size={15} strokeWidth={1.6} />, label: "Save GIF", danger: false,
      action: () => { onSaveGif!(); triggerClose(); },
    }] : []),
    { icon: <CornerUpLeft size={15} strokeWidth={1.6} />, label: "Reply",               danger: false, action: () => { onReply();               triggerClose(); } },
    { icon: <Copy         size={15} strokeWidth={1.6} />, label: "Copy",                danger: false, action: () => { onCopy();                triggerClose(); } },
    { icon: <CheckSquare  size={15} strokeWidth={1.6} />, label: "Select",              danger: false, action: () => { triggerClose(); setTimeout(() => onSelect?.(message.id), 300); } },
    { icon: <Trash2       size={15} strokeWidth={1.6} />, label: "Delete for me",       danger: true,  action: () => { onDeleteForMe();       triggerClose(); } },
    ...(isOwn ? [{
      icon: <Trash2 size={15} strokeWidth={1.6} />, label: "Delete for everyone", danger: true,
      action: () => { onDeleteForEveryone(); triggerClose(); },
    }] : []),
  ];

  const dangerStart = menuItems.findIndex((m) => m.danger);

  // ── Visual helper: label-specific colour (mirrors ChatActionModal) ──────────
  const getColor     = (item: typeof menuItems[number]) => item.danger ? "#EF4444" : "rgba(255,255,255,0.85)";
  const getIconColor = (item: typeof menuItems[number]) => item.danger ? "#EF4444" : "rgba(255,255,255,0.4)";

  return createPortal(
    <>
      <style>{`
        @keyframes _maBgIn  { from { opacity: 0; } to   { opacity: 1; } }
        @keyframes _maBgOut { from { opacity: 1; } to   { opacity: 0; } }

        @keyframes _maPopIn {
          0%   { opacity: 0; transform: scale(0.85); }
          60%  { opacity: 1; transform: scale(1.03); }
          100% { opacity: 1; transform: scale(1);    }
        }
        @keyframes _maPopOut {
          from { opacity: 1; transform: scale(1);    }
          to   { opacity: 0; transform: scale(0.88); }
        }

        @keyframes _trayIn {
          0%   { opacity: 0; transform: translateY(10px) scale(0.84); }
          65%  { opacity: 1; transform: translateY(-2px) scale(1.02); }
          100% { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes _emojiIn {
          0%   { opacity: 0; transform: scale(0.35) translateY(8px); }
          65%  { opacity: 1; transform: scale(1.18) translateY(-2px); }
          100% { opacity: 1; transform: scale(1)    translateY(0);    }
        }
        @keyframes _emojiPop {
          0%   { transform: scale(1)    rotate(0deg);   }
          22%  { transform: scale(1.6)  rotate(-12deg); }
          50%  { transform: scale(0.78) rotate(6deg);   }
          72%  { transform: scale(1.14) rotate(-3deg);  }
          100% { transform: scale(1)    rotate(0deg);   }
        }
        @keyframes _actionsIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }

        .ma3-emoji  { -webkit-tap-highlight-color: transparent; transition: transform 0.12s ease; }
        .ma3-emoji:active { transform: scale(0.82) !important; }

        .ma3-item { -webkit-tap-highlight-color: transparent; }
        .ma3-item:hover  { background-color: rgba(255,255,255,0.05) !important; }
        .ma3-item:active { background-color: rgba(255,255,255,0.08) !important; }

        .EmojiPickerReact.epr-dark-theme {
          --epr-bg-color:                 #0D0D18;
          --epr-category-label-bg-color:  #0D0D18;
          --epr-hover-bg-color:           rgba(139,92,246,0.18);
          --epr-focus-bg-color:           rgba(139,92,246,0.25);
          --epr-highlight-color:          #8B5CF6;
          --epr-search-input-bg-color:    rgba(255,255,255,0.06);
          --epr-search-input-text-color:  #FFFFFF;
          --epr-picker-border-color:      rgba(255,255,255,0.08);
          --epr-text-color:               #FFFFFF;
          --epr-category-icon-active-color: #8B5CF6;
          --epr-skin-tone-picker-menu-color: #0D0D18;
          border-radius: 16px !important;
        }

        @keyframes _pickerIn   { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
        @keyframes _pickerBgIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      {/* ── Backdrop ── */}
      <div
        onClick={ready ? triggerClose : undefined}
        style={{
          position:             "fixed",
          top:                  panelRect?.top    ?? 0,
          left:                 panelRect?.left   ?? 0,
          width:                panelRect?.width  ?? "100vw",
          height:               panelRect?.height ?? "100vh",
          zIndex:               500,
          backgroundColor:      "rgba(0,0,0,0.62)",
          backdropFilter:       "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          animation:            closing ? "_maBgOut 0.26s ease forwards" : "_maBgIn 0.22s ease",
        }}
      />

      {/* ── Anchored column ── */}
      <div
        style={{
          position:      "fixed",
          zIndex:        501,
          top:           anchorTop  ?? "50%",
          left:          anchorLeft !== undefined ? anchorLeft : (anchorRight !== undefined ? "auto" : "50%"),
          right:         anchorRight !== undefined ? anchorRight : "auto",
          transform:     (!bubbleRect) ? "translate(-50%,-50%)" : undefined,
          display:         "flex",
          flexDirection:   "column",
          alignItems:      isOwn ? "flex-end" : "flex-start",
          gap:             "10px",
          pointerEvents:   "none",
          width:           MODAL_W,
          transformOrigin: isOwn ? "top right" : "top left",
          animation:       closing
            ? "_maPopOut 0.26s ease forwards"
            : "_maPopIn 0.22s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >

        {/* ── Emoji tray ── */}
        <div
          style={{
            pointerEvents:        "auto",
            display:              "flex",
            alignItems:           "center",
            gap:                  "2px",
            backgroundColor:      "rgba(8,8,18,0.88)",
            backdropFilter:       "blur(32px)",
            WebkitBackdropFilter: "blur(32px)",
            border:               "1px solid rgba(255,255,255,0.08)",
            borderRadius:         "999px",
            padding:              "5px 8px",
            boxShadow:            "0 8px 32px rgba(0,0,0,0.5)",
            animation:            "_trayIn 0.3s cubic-bezier(0.34,1.56,0.64,1) 0.04s both",
          }}
        >
          {reactionEmojis.map((emoji, i) => (
            <button
              key={emoji}
              className="ma3-emoji"
              onClick={() => handleReact(emoji)}
              style={{
                width:           "44px",
                height:          "44px",
                borderRadius:    "50%",
                border:          myReaction === emoji ? "2px solid #8B5CF6" : "2px solid transparent",
                backgroundColor: myReaction === emoji ? "rgba(139,92,246,0.18)" : "transparent",
                cursor:          "pointer",
                display:         "flex",
                alignItems:      "center",
                justifyContent:  "center",
                fontSize:        "23px",
                lineHeight:      1,
                padding:         0,
                flexShrink:      0,
                animation:       tappedEmoji === emoji
                  ? "_emojiPop 0.44s cubic-bezier(0.34,1.56,0.64,1) forwards"
                  : `_emojiIn 0.32s cubic-bezier(0.34,1.56,0.64,1) ${0.06 + i * 0.032}s both`,
              }}
            >
              {emoji}
            </button>
          ))}

          {/* + button */}
          <button
            className="ma3-emoji"
            onClick={() => setShowFullPicker(true)}
            style={{
              width:           "44px",
              height:          "44px",
              borderRadius:    "50%",
              border:          "2px solid transparent",
              backgroundColor: "rgba(255,255,255,0.07)",
              cursor:          "pointer",
              display:         "flex",
              alignItems:      "center",
              justifyContent:  "center",
              flexShrink:      0,
              padding:         0,
              animation:       `_emojiIn 0.32s cubic-bezier(0.34,1.56,0.64,1) ${0.06 + reactionEmojis.length * 0.032}s both`,
            }}
          >
            <Plus size={17} color="rgba(255,255,255,0.5)" strokeWidth={2.2} />
          </button>
        </div>

        {/* ── Message preview bubble ── */}
        <div
          style={{
            pointerEvents:   "none",
            maxWidth:        "72%",
            backgroundColor: isOwn ? "#8B5CF6" : "#1E1E2E",
            borderRadius:    isOwn ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
            padding:         "10px 14px",
            boxShadow:       isOwn
              ? "0 6px 24px rgba(139,92,246,0.4)"
              : "0 6px 24px rgba(0,0,0,0.4)",
          }}
        >
          <p style={{
            margin:          0,
            fontSize:        "14px",
            color:           "#FFFFFF",
            lineHeight:      1.5,
            wordBreak:       "break-word",
            display:         "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow:        "hidden",
            fontFamily:      "'Inter', sans-serif",
          }}>
            {previewText}
          </p>
        </div>

        {/* ── Action list — styled exactly like ChatActionModal ── */}
        <div
          style={{
            pointerEvents: "auto",
            width:         "100%",
            borderRadius:  "14px",
            border:        "1px solid rgba(255,255,255,0.08)",
            boxShadow:     "0 12px 40px rgba(0,0,0,0.5)",
            overflow:      "hidden",
            position:      "relative",
            animation:     "_actionsIn 0.28s ease 0.08s both",
          }}
        >
          {/* Frosted glass bg — identical to ChatActionModal */}
          <div style={{
            position:             "absolute",
            inset:                0,
            backgroundColor:      "rgba(8,8,18,0.88)",
            backdropFilter:       "blur(32px)",
            WebkitBackdropFilter: "blur(32px)",
            zIndex:               -1,
          }} />

          {/* Tap-block until keyboard finishes dismissing */}
          {!ready && <div style={{ position: "absolute", inset: 0, zIndex: 99 }} />}

          <div style={{ padding: "6px 0" }}>
            {menuItems.map((item, i) => {
              const isFirstDanger = i === dangerStart;
              return (
                <div key={item.label}>
                  {isFirstDanger && (
                    <div style={{ height: "1px", backgroundColor: "rgba(255,255,255,0.06)", margin: "4px 0" }} />
                  )}
                  <button
                    className="ma3-item"
                    onClick={item.action}
                    onTouchEnd={(e) => { e.preventDefault(); item.action(); }}
                    style={{
                      display:     "flex",
                      alignItems:  "center",
                      gap:         "10px",
                      width:       "100%",
                      padding:     "9px 14px",
                      background:  "none",
                      border:      "none",
                      cursor:      "pointer",
                      color:       getColor(item),
                      fontSize:    "15px",
                      fontFamily:  "'Inter', sans-serif",
                      textAlign:   "left",
                    }}
                  >
                    <span style={{ color: getIconColor(item), display: "flex", flexShrink: 0 }}>
                      {item.icon}
                    </span>
                    {item.label}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* ── Full emoji picker (opens when + is tapped) ── */}
      {showFullPicker && (
        <div
          onClick={() => setShowFullPicker(false)}
          style={{
            position:             "fixed",
            top:                  panelRect?.top    ?? 0,
            left:                 panelRect?.left   ?? 0,
            width:                panelRect?.width  ?? "100vw",
            height:               panelRect?.height ?? "100vh",
            zIndex:               600,
            backgroundColor:      "rgba(0,0,0,0.4)",
            backdropFilter:       "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display:              "flex",
            alignItems:           "center",
            justifyContent:       "center",
            padding:              "16px",
            animation:            "_pickerBgIn 0.22s ease",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              animation:    "_pickerIn 0.26s cubic-bezier(0.34,1.56,0.64,1)",
              borderRadius: "16px",
              overflow:     "hidden",
              boxShadow:    "0 20px 60px rgba(0,0,0,0.6)",
            }}
          >
            <EmojiPicker
              theme={"dark" as any}
              lazyLoadEmojis
              previewConfig={{ showPreview: false }}
              onEmojiClick={(emojiData: any) => {
                setShowFullPicker(false);
                handleReact(emojiData.emoji);
              }}
              width={Math.min(360, typeof window !== "undefined" ? window.innerWidth - 32 : 360)}
              height={Math.min(420, typeof window !== "undefined" ? window.innerHeight - 120 : 420)}
            />
          </div>
        </div>
      )}
    </>,
    document.body!
  );
}