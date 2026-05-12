"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Send, X, ImageIcon } from "lucide-react";
import { Avatar } from "@/components/profile/CommentAvatar";
import { GifItem, GifPicker } from "@/components/gif/GifComponents";

const QUICK_EMOJIS = ["😊", "😄", "🤣", "😜", "😆", "😝", "😂", "😁", "🥰", "🤩", "💋"];

export interface ReplyingTo {
  id: string | number;
  username: string;
  reply_to_username?: string | null;
  reply_to_id?: string | number | null;
}

interface CommentInputBarProps {
  viewer?: { username: string; display_name: string; avatar_url?: string } | null;
  viewerUserId?: string;
  replyingTo?: ReplyingTo | null;
  onCancelReply?: () => void;
  onSend: (text: string, gif_url?: string) => Promise<void>;
  isOpen: boolean;
}

export default function CommentInputBar({
  viewer,
  viewerUserId,
  replyingTo,
  onCancelReply,
  onSend,
  isOpen,
}: CommentInputBarProps) {
  const [text, setText] = React.useState("");
  const [selectedGif, setSelectedGif] = React.useState<GifItem | null>(null);
  const [gifPickerOpen, setGifPickerOpen] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);
  const [keyboardTranslateY, setKeyboardTranslateY] = React.useState(0);
  const [mounted, setMounted] = React.useState(false);
  const [emojiVisible, setEmojiVisible] = React.useState(false);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const barRef = React.useRef<HTMLDivElement>(null);
  const emojiAnimRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => { setMounted(true); }, []);

  // visualViewport: track keyboard height on iOS + Android
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;

    const vv = window.visualViewport;

    let pending = false;
    const update = () => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        const translateY = Math.max(0, window.innerHeight - (vv.height ?? window.innerHeight) - (vv.offsetTop ?? 0));
        setKeyboardTranslateY(translateY);
      });
    };

    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    update();

    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  // Show/hide emoji strip with slight delay for smoothness
  React.useEffect(() => {
    if (emojiAnimRef.current) clearTimeout(emojiAnimRef.current);
    if (isFocused) {
      setEmojiVisible(true);
    } else {
      emojiAnimRef.current = setTimeout(() => setEmojiVisible(false), 300);
    }
    return () => { if (emojiAnimRef.current) clearTimeout(emojiAnimRef.current); };
  }, [isFocused]);

  // Focus input when replying
  React.useEffect(() => {
    if (replyingTo) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [replyingTo]);

  // Reset on close
  React.useEffect(() => {
    if (!isOpen) {
      setText("");
      setSelectedGif(null);
      setGifPickerOpen(false);
      setIsFocused(false);
    }
  }, [isOpen]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed && !selectedGif) return;
    const gifUrl = selectedGif?.url;
    setText("");
    setSelectedGif(null);
    await onSend(trimmed, gifUrl);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const canSend = text.trim().length > 0 || selectedGif !== null;

  const replyTargetName = replyingTo
    ? (replyingTo.reply_to_username || replyingTo.username || "user")
    : null;

  const placeholder = replyingTo
    ? `Replying to @${replyTargetName}…`
    : selectedGif
    ? "Add a caption… (optional)"
    : "Add a comment…";

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      ref={barRef}
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1100,
        backgroundColor: "#0D0D1A",
        borderTop: "1px solid #1C1C2E",
        transform: `translateY(-${keyboardTranslateY}px)`,
        transition: "transform 0.22s cubic-bezier(0.32, 0.72, 0, 1)",
        width: "100%",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {/* GIF Picker — floats above bar */}
      {gifPickerOpen && (
        <div style={{ position: "absolute", bottom: "100%", left: 0, right: 0, zIndex: 1101 }}>
          <GifPicker
            onSelect={(gif) => { setSelectedGif(gif); setGifPickerOpen(false); setText(""); }}
            onClose={() => setGifPickerOpen(false)}
            viewerUserId={viewerUserId}
          />
        </div>
      )}

      {/* Emoji + GIF strip — animated */}
      <div
        style={{
          overflow: "hidden",
          maxHeight: emojiVisible ? "52px" : "0px",
          opacity: emojiVisible ? 1 : 0,
          transition: "max-height 0.25s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.2s ease",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "10px 14px 4px",
            overflowX: "auto",
            scrollbarWidth: "none",
          }}
        >
          <button
            onClick={() => setGifPickerOpen((o) => !o)}
            style={{
              padding: "5px 10px",
              borderRadius: "8px",
              border: `1px solid ${gifPickerOpen ? "#8B5CF6" : "#2A2A3D"}`,
              backgroundColor: gifPickerOpen ? "#2D1F4E" : "#1C1C2E",
              color: gifPickerOpen ? "#8B5CF6" : "#8A8AA0",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              flexShrink: 0,
              fontFamily: "'Inter', sans-serif",
              transition: "all 0.15s",
            }}
          >
            GIF
          </button>
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => setText((p) => p + emoji)}
              style={{
                fontSize: "22px",
                background: "none",
                border: "none",
                cursor: "pointer",
                flexShrink: 0,
                lineHeight: 1,
                padding: "2px",
                borderRadius: "6px",
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Reply banner */}
      {replyingTo && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "6px 14px",
            backgroundColor: "#13131F",
            borderTop: "1px solid #1C1C2E",
            animation: "fadeSlideIn 0.18s ease",
          }}
        >
          <span style={{ fontSize: "12px", color: "#8B5CF6", fontFamily: "'Inter', sans-serif" }}>
            Replying to <strong>@{replyTargetName}</strong>
          </span>
          <button
            onClick={onCancelReply}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#6B6B8A", display: "flex", alignItems: "center", padding: "2px" }}
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Selected GIF preview */}
      {selectedGif && (
        <div style={{ padding: "6px 14px 0" }}>
          <div style={{ position: "relative", display: "inline-block" }}>
            <img
              src={selectedGif.preview_url || selectedGif.url}
              alt="Selected GIF"
              style={{ height: "70px", borderRadius: "8px", display: "block" }}
            />
            <button
              onClick={() => setSelectedGif(null)}
              style={{
                position: "absolute", top: "4px", right: "4px",
                width: "20px", height: "20px", borderRadius: "50%",
                border: "none", backgroundColor: "rgba(0,0,0,0.7)",
                color: "#fff", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
              }}
            >
              <X size={11} />
            </button>
          </div>
        </div>
      )}

      {/* Main input row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "10px 14px 14px",
        }}
      >
        <Avatar src={viewer?.avatar_url} name={viewer?.display_name || "You"} size={32} />
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            backgroundColor: "#13131F",
            border: `1px solid ${isFocused ? "#8B5CF6" : "#2A2A3D"}`,
            borderRadius: "24px",
            padding: "9px 14px",
            gap: "8px",
            transition: "border-color 0.18s ease",
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKey}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              fontSize: "13px",
              color: "#E2E8F0",
              fontFamily: "'Inter', sans-serif",
              caretColor: "#8B5CF6",
            }}
          />
          <button
            onClick={handleSend}
            disabled={!canSend}
            style={{
              background: "none",
              border: "none",
              cursor: canSend ? "pointer" : "default",
              color: canSend ? "#8B5CF6" : "#3A3A4D",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "2px",
              transition: "color 0.15s, transform 0.1s",
              transform: canSend ? "scale(1)" : "scale(0.9)",
            }}
          >
            <Send size={17} strokeWidth={2} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>,
    document.body
  );
}