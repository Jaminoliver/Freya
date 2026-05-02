"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Copy, CornerUpLeft, Trash2, CheckSquare, Bookmark, Plus } from "lucide-react";
import type { Message } from "@/lib/types/messages";

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

interface Props {
  message:             Message;
  isOwn:               boolean;
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
  message, isOwn,
  onCopy, onReply, onDeleteForMe, onDeleteForEveryone, onSelect, onSaveGif, onReact, onClose,
}: Props) {
  const [closing,     setClosing]     = useState(false);
  const [ready,       setReady]       = useState(false);
  const [tappedEmoji, setTappedEmoji] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 200);
    return () => clearTimeout(t);
  }, []);

  const triggerClose = () => {
    setClosing(true);
    setTimeout(() => { setClosing(false); onClose(); }, 260);
  };

  const handleReact = (emoji: string) => {
    setTappedEmoji(emoji);
    setTimeout(() => { onReact?.(emoji); triggerClose(); }, 390);
  };

  const myReaction = (message.reactions ?? []).find((r) => r.reactedByMe)?.emoji ?? null;

  const previewText =
    message.text ??
    (message.type === "media" ? "📷 Photo"  :
     message.type === "gif"   ? "🎞️ GIF"   :
     message.type === "ppv"   ? "🔒 PPV"    : "Message");

  const menuItems = [
    ...(onSaveGif ? [{
      icon: <Bookmark size={18} strokeWidth={1.6} />, label: "Save GIF", danger: false,
      action: () => { onSaveGif(); triggerClose(); },
    }] : []),
    { icon: <CornerUpLeft size={18} strokeWidth={1.6} />, label: "Reply",               danger: false, action: () => { onReply();               triggerClose(); } },
    { icon: <Copy         size={18} strokeWidth={1.6} />, label: "Copy",                danger: false, action: () => { onCopy();                triggerClose(); } },
    { icon: <CheckSquare  size={18} strokeWidth={1.6} />, label: "Select",              danger: false, action: () => { triggerClose(); setTimeout(() => onSelect?.(message.id), 300); } },
    { icon: <Trash2       size={18} strokeWidth={1.6} />, label: "Delete for me",       danger: true,  action: () => { onDeleteForMe();       triggerClose(); } },
    ...(isOwn ? [{
      icon: <Trash2 size={18} strokeWidth={1.6} />, label: "Delete for everyone", danger: true,
      action: () => { onDeleteForEveryone(); triggerClose(); },
    }] : []),
  ];
  const dangerStart = menuItems.findIndex((m) => m.danger);

  return createPortal(
    <>
      <style>{`
        @keyframes _maBgIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes _maBgOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes _maIn {
          0%   { opacity: 0; transform: scale(0.88) translateY(16px); }
          65%  { opacity: 1; transform: scale(1.01) translateY(-2px); }
          100% { opacity: 1; transform: scale(1)    translateY(0);    }
        }
        @keyframes _maOut {
          from { opacity: 1; transform: scale(1)    translateY(0);    }
          to   { opacity: 0; transform: scale(0.88) translateY(12px); }
        }
        @keyframes _trayIn {
          0%   { opacity: 0; transform: translateY(12px) scale(0.82); }
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
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .ma2-emoji  { -webkit-tap-highlight-color: transparent; transition: transform 0.12s ease; }
        .ma2-emoji:active { transform: scale(0.82) !important; }
        .ma2-action { -webkit-tap-highlight-color: transparent; }
        .ma2-action:hover  { background-color: rgba(255,255,255,0.05) !important; }
        .ma2-action:active { background-color: rgba(255,255,255,0.10) !important; }
      `}</style>

      {/* ── Blurred backdrop ── */}
      <div
        onClick={ready ? triggerClose : undefined}
        style={{
          position:             "fixed",
          inset:                0,
          zIndex:               500,
          backgroundColor:      "rgba(0,0,0,0.62)",
          backdropFilter:       "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          animation:            closing ? "_maBgOut 0.26s ease forwards" : "_maBgIn 0.2s ease",
        }}
      />

      {/* ── Floating content ── */}
      <div
        style={{
          position:       "fixed",
          inset:          0,
          zIndex:         501,
          display:        "flex",
          flexDirection:  "column",
          alignItems:     "center",
          justifyContent: "center",
          padding:        "20px",
          gap:            "10px",
          pointerEvents:  "none",
          animation:      closing
            ? "_maOut 0.26s ease forwards"
            : "_maIn 0.3s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >

        {/* ── Emoji reaction tray ── */}
        <div
          style={{
            pointerEvents:        "auto",
            display:              "flex",
            alignItems:           "center",
            gap:                  "2px",
            backgroundColor:      "rgba(16,16,28,0.92)",
            backdropFilter:       "blur(32px)",
            WebkitBackdropFilter: "blur(32px)",
            border:               "1px solid rgba(255,255,255,0.1)",
            borderRadius:         "999px",
            padding:              "5px 8px",
            boxShadow:            "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
            animation:            "_trayIn 0.34s cubic-bezier(0.34,1.56,0.64,1) 0.04s both",
          }}
        >
          {REACTION_EMOJIS.map((emoji, i) => (
            <button
              key={emoji}
              className="ma2-emoji"
              onClick={() => handleReact(emoji)}
              style={{
                width:           "46px",
                height:          "46px",
                borderRadius:    "50%",
                border:          myReaction === emoji ? "2px solid #8B5CF6" : "2px solid transparent",
                backgroundColor: myReaction === emoji ? "rgba(139,92,246,0.18)" : "transparent",
                cursor:          "pointer",
                display:         "flex",
                alignItems:      "center",
                justifyContent:  "center",
                fontSize:        "24px",
                lineHeight:      1,
                padding:         0,
                flexShrink:      0,
                animation:       tappedEmoji === emoji
                  ? "_emojiPop 0.44s cubic-bezier(0.34,1.56,0.64,1) forwards"
                  : `_emojiIn 0.32s cubic-bezier(0.34,1.56,0.64,1) ${0.06 + i * 0.032}s both`,
                transition:      tappedEmoji ? undefined : "border-color 0.15s, background-color 0.15s",
              }}
            >
              {emoji}
            </button>
          ))}

          {/* + button */}
          <button
            className="ma2-emoji"
            style={{
              width:           "46px",
              height:          "46px",
              borderRadius:    "50%",
              border:          "2px solid transparent",
              backgroundColor: "rgba(255,255,255,0.07)",
              cursor:          "pointer",
              display:         "flex",
              alignItems:      "center",
              justifyContent:  "center",
              flexShrink:      0,
              padding:         0,
              animation:       `_emojiIn 0.32s cubic-bezier(0.34,1.56,0.64,1) ${0.06 + REACTION_EMOJIS.length * 0.032}s both`,
            }}
          >
            <Plus size={18} color="rgba(255,255,255,0.5)" strokeWidth={2.2} />
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
            margin:             0,
            fontSize:           "14px",
            color:              "#FFFFFF",
            lineHeight:         1.5,
            wordBreak:          "break-word",
            display:            "-webkit-box",
            WebkitLineClamp:    3,
            WebkitBoxOrient:    "vertical",
            overflow:           "hidden",
            fontFamily:         "'Inter', sans-serif",
          }}>
            {previewText}
          </p>
        </div>

        {/* ── Action list ── */}
        <div
          style={{
            pointerEvents: "auto",
            width:         "100%",
            maxWidth:      "340px",
            borderRadius:  "16px",
            border:        "1px solid rgba(255,255,255,0.08)",
            boxShadow:     "0 12px 40px rgba(0,0,0,0.55)",
            overflow:      "hidden",
            position:      "relative",
            animation:     "_actionsIn 0.3s ease 0.1s both",
          }}
        >
          {/* Frosted glass bg — matches ChatActionModal exactly */}
          <div style={{
            position:             "absolute",
            inset:                0,
            backgroundColor:      "rgba(8,8,18,0.9)",
            backdropFilter:       "blur(32px)",
            WebkitBackdropFilter: "blur(32px)",
            zIndex:               -1,
          }} />

          {/* Block touches until animation settles */}
          {!ready && <div style={{ position: "absolute", inset: 0, zIndex: 99 }} />}

          {menuItems.map((item, i) => (
            <div key={item.label}>
              {i === dangerStart && (
                <div style={{ height: "1px", backgroundColor: "rgba(255,255,255,0.06)" }} />
              )}
              <button
                className="ma2-action"
                onClick={item.action}
                onTouchEnd={(e) => { e.preventDefault(); item.action(); }}
                style={{
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "space-between",
                  width:          "100%",
                  padding:        "15px 20px",
                  background:     "none",
                  border:         "none",
                  cursor:         "pointer",
                  color:          item.danger ? "#EF4444" : "rgba(255,255,255,0.85)",
                  fontSize:       "15px",
                  fontFamily:     "'Inter', sans-serif",
                  textAlign:      "left",
                  letterSpacing:  "0.01em",
                }}
              >
                <span>{item.label}</span>
                <span style={{ color: item.danger ? "#EF4444" : "rgba(255,255,255,0.3)", display: "flex" }}>
                  {item.icon}
                </span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </>,
    document.body!
  );
}