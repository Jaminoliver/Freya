"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Send } from "lucide-react";

interface Props {
  open:           boolean;
  creatorId:      string;
  creatorName:    string;
  storyId:        number;
  thumbnailUrl:   string | null;
  storyMediaType: "photo" | "video";
  storyMediaUrl:  string;
  onClose:        () => void;
  onCancel:       () => void;
}

export default function StoryReplyOverlay({
  open, creatorId, creatorName, storyId, thumbnailUrl, storyMediaType, storyMediaUrl, onClose, onCancel,
}: Props) {
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const inputRef     = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Transfer focus from hidden input to real input on mount
  useEffect(() => {
    if (open && !sent) {
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [open, sent]);

  // Reset state when overlay closes
  useEffect(() => {
    if (!open) { setText(""); setSent(false); }
  }, [open]);

  // Resize overlay to match visualViewport so input bar sits above keyboard
  useEffect(() => {
    if (!open) return;
    const vv = window.visualViewport;
    if (!vv) return;

    let pending = false;
    const update = () => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        const el = containerRef.current;
        if (!el) return;
        el.style.top    = `${vv.offsetTop}px`;
        el.style.left   = `${vv.offsetLeft}px`;
        el.style.width  = `${vv.width}px`;
        el.style.height = `${vv.height}px`;
      });
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [open]);

  const handleSend = useCallback(() => {
    const msg = text.trim();
    if (!msg) return;

    // Show sent immediately and close
    inputRef.current?.blur();
    setText("");
    setSent(true);
    setTimeout(() => onClose(), 1500);

    // Fire API in background
    (async () => {
      try {
        const cRes = await fetch("/api/conversations", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetUserId: creatorId }),
        });
        const { conversationId } = await cRes.json();
        if (!conversationId) throw new Error("No conversation");

        const thumb = thumbnailUrl ?? (storyMediaType === "photo" ? storyMediaUrl : null);
        await fetch(`/api/conversations/${conversationId}/messages`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: msg,
            story_reply_story_id: storyId,
            story_reply_thumbnail_url: thumb,
          }),
        });
      } catch {
        // handle failure later
      }
    })();
  }, [text, creatorId, storyId, thumbnailUrl, storyMediaType, storyMediaUrl, onClose]);

  const handleBackdropTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (!sent) onCancel();
  }, [sent, onCancel]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={containerRef}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        // Initial values — overridden immediately by visualViewport update
        top: 0, left: 0,
        width: "100%",
        height: "100%",
        zIndex: 10002,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <style>{`
        .sro-input::placeholder { color: rgba(255,255,255,0.4); }
        .sro-input:focus { outline: none; }
        @keyframes sro-sent { 0% { opacity:0; transform:scale(0.9); } 100% { opacity:1; transform:scale(1); } }
      `}</style>

      {/* Backdrop — tap to close */}
      <div onClick={handleBackdropTap} style={{ flex: 1, background: "rgba(0,0,0,0.5)" }} />

      {/* Input area */}
      <div style={{
        background: "rgba(13,13,24,0.97)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        padding: "14px 16px 14px",
        maxWidth: 480,
        width: "100%",
        alignSelf: "center",
      }}>
        {sent ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "11px 0", animation: "sro-sent 0.2s ease" }}>
            <span style={{ fontSize: 15, color: "#C4B5FD", fontFamily: "Inter,sans-serif", fontWeight: 600 }}>Reply sent ✓</span>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              flex: 1, display: "flex", alignItems: "center",
              background: "rgba(255,255,255,0.1)", borderRadius: 24,
              border: "1px solid rgba(255,255,255,0.15)", padding: "10px 16px",
            }}>
              <input
                ref={inputRef}
                className="sro-input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
                onBlur={() => { if (!sent) onCancel(); }}
                placeholder={`Reply to ${creatorName}…`}
                enterKeyHint="send"
                style={{ flex: 1, background: "none", border: "none", color: "#fff", fontSize: 16, fontFamily: "Inter,sans-serif" }}
              />
            </div>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onTouchStart={(e) => e.preventDefault()}
              onClick={handleSend}
              disabled={!text.trim()}
              style={{
                background: text.trim() ? "linear-gradient(135deg, #8B5CF6, #EC4899)" : "rgba(255,255,255,0.08)",
                border: "none", borderRadius: "50%", width: 44, height: 44,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: !text.trim() ? "not-allowed" : "pointer",
                transition: "background 0.2s",
              }}
            >
              <Send size={18} color="#fff" />
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}