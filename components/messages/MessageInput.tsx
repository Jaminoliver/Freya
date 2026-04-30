// components/messages/MessageInput.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { ImageIcon, Send, X, CornerUpLeft } from "lucide-react";
import { PPVToggle } from "@/components/messages/PPVToggle";
import { MediaPreviewRow } from "@/components/messages/MediaPreviewRow";
import { GifPicker, GifItem } from "@/components/gif/GifComponents";
import type { Message } from "@/lib/types/messages";

interface Props {
  onSend:         (text: string, mediaFiles?: File[], ppvPrice?: number) => void;
  onSendGif?:     (gif: GifItem) => void;
  onTyping?:      () => void;
  onTipClick?:    () => void;
  disabled?:      boolean;
  replyTo?:            Message | null;
  replyToMediaIndex?:  number;
  onCancelReply?:      () => void;
  viewerUserId?:       string;
}

export function MessageInput({ onSend, onSendGif, onTyping, onTipClick, disabled = false, replyTo, replyToMediaIndex = 0, onCancelReply, viewerUserId }: Props) {
  const [text,          setText]          = useState("");
  const [mediaFiles,    setMediaFiles]    = useState<File[]>([]);
  const [ppvEnabled,    setPpvEnabled]    = useState(false);
  const [ppvPrice,      setPpvPrice]      = useState(0);
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const fileRef      = useRef<HTMLInputElement>(null);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const throttleRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputAreaRef = useRef<HTMLDivElement>(null);

  const canSend = !disabled && (text.trim().length > 0 || mediaFiles.length > 0);

  const handleSend = () => {
    if (!canSend) return;
    onSend(text, mediaFiles.length > 0 ? mediaFiles : undefined, ppvEnabled ? ppvPrice : undefined);
    setText(""); setMediaFiles([]); setPpvEnabled(false); setPpvPrice(0);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      // Refocus so keyboard stays up after send (WhatsApp behavior)
      textareaRef.current.focus();
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";

    if (onTyping && !throttleRef.current) {
      onTyping();
      throttleRef.current = setTimeout(() => {
        throttleRef.current = null;
      }, 1000);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) setMediaFiles((prev) => [...prev, ...files]);
    e.target.value = "";
  };

  // Close GIF picker on outside click
  useEffect(() => {
    if (!gifPickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (inputAreaRef.current && !inputAreaRef.current.contains(e.target as Node)) {
        setGifPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [gifPickerOpen]);

  const handleGifSelect = (gif: GifItem) => {
    setGifPickerOpen(false);
    onSendGif?.(gif);
  };

  return (
    <div
      ref={inputAreaRef}
      style={{
        borderTop:       "1px solid #1E1E2E",
        backgroundColor: "#0D0D1A",
        fontFamily:      "'Inter',sans-serif",
        flexShrink:      0,
        zIndex:          50,
        touchAction:     "none",
        userSelect:      "none",
        paddingBottom:   "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {/* WhatsApp-style reply bar */}
      {replyTo && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", borderBottom: "1px solid #1E1E2E", backgroundColor: "#13131F" }}>
          <div style={{ width: "3px", height: "36px", borderRadius: "2px", backgroundColor: "#8B5CF6", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: "12px", color: "#8B5CF6", fontWeight: 600, marginBottom: "2px" }}>
                <CornerUpLeft size={11} style={{ marginRight: "4px", verticalAlign: "middle" }} />
                Reply
              </p>
              <p style={{ margin: 0, fontSize: "13px", color: "#A3A3C2", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {replyTo.text
                  ? replyTo.text
                  : replyTo.type === "gif"
                  ? "GIF"
                  : replyTo.type === "media" || replyTo.type === "ppv"
                  ? (replyTo.mediaUrls?.[0]?.match(/\.(mp4|mov|webm|avi|mkv)(\?|$)/i) || replyTo.mediaUrls?.[0]?.includes("#video") ? "Video" : "Photo")
                  : "Media"}
              </p>
            </div>
            {replyTo.type === "gif" && replyTo.gifUrl && (
              <img src={replyTo.gifUrl} alt="GIF" style={{ width: "40px", height: "40px", borderRadius: "6px", objectFit: "cover", flexShrink: 0 }} />
            )}
            {(replyTo.type === "media" || replyTo.type === "ppv") && replyTo.mediaUrls?.[replyToMediaIndex] && (
              replyTo.mediaUrls[replyToMediaIndex].match(/\.(mp4|mov|webm|avi|mkv)(\?|$)/i) || replyTo.mediaUrls[replyToMediaIndex].includes("#video")
                ? <div style={{ width: "40px", height: "40px", borderRadius: "6px", backgroundColor: "#1C1C2E", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" }}>
                    <video src={replyTo.mediaUrls[replyToMediaIndex].replace("#video", "")} muted playsInline preload="metadata" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} onLoadedMetadata={(e) => { (e.currentTarget as HTMLVideoElement).currentTime = 0.5; }} />
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.3)" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#FFFFFF"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    </div>
                  </div>
                : <img src={replyTo.mediaUrls[replyToMediaIndex]} alt="" style={{ width: "40px", height: "40px", borderRadius: "6px", objectFit: "cover", flexShrink: 0 }} />
            )}
          </div>
          <button onClick={onCancelReply} style={{ background: "none", border: "none", cursor: "pointer", color: "#4A4A6A", display: "flex", padding: "4px", flexShrink: 0 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#A3A3C2")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#4A4A6A")}
          >
            <X size={16} strokeWidth={1.8} />
          </button>
        </div>
      )}
      {mediaFiles.length > 0 && (
        <MediaPreviewRow files={mediaFiles} onRemove={(i) => setMediaFiles((p) => p.filter((_, idx) => idx !== i))} />
      )}
      {mediaFiles.length > 0 && (
        <PPVToggle enabled={ppvEnabled} price={ppvPrice} onToggle={setPpvEnabled} onPriceChange={setPpvPrice} />
      )}

      {gifPickerOpen && (
        <GifPicker
          onSelect={handleGifSelect}
          onClose={() => setGifPickerOpen(false)}
          viewerUserId={viewerUserId}
        />
      )}

      <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 12px", minHeight: "64px" }}>
        <input ref={fileRef} type="file" accept="image/*,video/*" multiple style={{ display: "none" }} onChange={handleFileChange} />

        <button title="Gallery" onClick={() => fileRef.current?.click()} disabled={disabled}
          style={{ background: "none", border: "none", cursor: disabled ? "default" : "pointer", color: "#C4C4D4", display: "flex", alignItems: "center", justifyContent: "center", padding: "7px", borderRadius: "8px", transition: "all 0.15s ease", flexShrink: 0, opacity: disabled ? 0.4 : 1 }}
          onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.backgroundColor = "#1C1C2E"; e.currentTarget.style.color = "#FFFFFF"; }}}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#C4C4D4"; }}
        >
          <ImageIcon size={22} strokeWidth={1.8} />
        </button>

        <button title="Tip" onClick={() => onTipClick?.()} disabled={disabled}
          style={{ background: "none", border: "none", cursor: disabled ? "default" : "pointer", color: "#C4C4D4", display: "flex", alignItems: "center", justifyContent: "center", padding: "7px", borderRadius: "8px", transition: "all 0.15s ease", flexShrink: 0, opacity: disabled ? 0.4 : 1 }}
          onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.backgroundColor = "#1C1C2E"; e.currentTarget.style.color = "#FFFFFF"; }}}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#C4C4D4"; }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 12 20 22 4 22 4 12"/>
            <rect x="2" y="7" width="20" height="5"/>
            <line x1="12" y1="22" x2="12" y2="7"/>
            <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
            <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
          </svg>
        </button>

        <button title="GIF" onClick={() => setGifPickerOpen((o) => !o)} disabled={disabled}
          style={{
            background:      gifPickerOpen ? "#2D1F4E" : "none",
            border:          `1px solid ${gifPickerOpen ? "#8B5CF6" : "transparent"}`,
            cursor:          disabled ? "default" : "pointer",
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "center",
            padding:         "5px 8px",
            borderRadius:    "8px",
            transition:      "all 0.15s ease",
            flexShrink:      0,
            opacity:         disabled ? 0.4 : 1,
          }}
          onMouseEnter={(e) => { if (!disabled && !gifPickerOpen) e.currentTarget.style.backgroundColor = "#1C1C2E"; }}
          onMouseLeave={(e) => { if (!gifPickerOpen) e.currentTarget.style.backgroundColor = "transparent"; }}
        >
          <span style={{ fontSize: "13px", fontWeight: 700, color: gifPickerOpen ? "#8B5CF6" : "#C4C4D4", letterSpacing: "0.5px", lineHeight: 1, fontFamily: "'Inter',sans-serif" }}>GIF</span>
        </button>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          disabled={disabled}
          placeholder="Type a message..."
          rows={1}
          style={{
            flex:            1,
            backgroundColor: "#1C1C2E",
            border:          "none",
            borderRadius:    "20px",
            padding:         "11px 18px",
            fontSize:        "14px",
            color:           "#FFFFFF",
            outline:         "none",
            fontFamily:      "'Inter',sans-serif",
            minWidth:        0,
            resize:          "none",
            overflow:        "hidden",
            lineHeight:      "1.45",
            maxHeight:       "120px",
            display:         "block",
            boxSizing:       "border-box",
            width:           "100%",
            opacity:         disabled ? 0.4 : 1,
          }}
        />

        <button onClick={handleSend} disabled={!canSend}
          style={{
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "center",
            width:           "42px",
            height:          "42px",
            borderRadius:    "50%",
            border:          "none",
            cursor:          canSend ? "pointer" : "default",
            background:      canSend ? "linear-gradient(to right, #8B5CF6, #EC4899)" : "#1C1C2E",
            color:           canSend ? "#FFFFFF" : "#4A4A6A",
            transition:      "all 0.15s ease",
            flexShrink:      0,
          }}
          onMouseEnter={(e) => { if (canSend) e.currentTarget.style.opacity = "0.88"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
        >
          <Send size={16} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}