"use client";

import { useState, useRef } from "react";
import { ImageIcon, Send, Banknote } from "lucide-react";
import { PPVToggle } from "@/components/messages/PPVToggle";
import { MediaPreviewRow } from "@/components/messages/MediaPreviewRow";

interface Props {
  onSend: (text: string, mediaFiles?: File[], ppvPrice?: number) => void;
}

export function MessageInput({ onSend }: Props) {
  const [text,       setText]       = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [ppvEnabled, setPpvEnabled] = useState(false);
  const [ppvPrice,   setPpvPrice]   = useState(0);
  const fileRef    = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSend = text.trim().length > 0 || mediaFiles.length > 0;

  const handleSend = () => {
    if (!canSend) return;
    onSend(text, mediaFiles.length > 0 ? mediaFiles : undefined, ppvEnabled ? ppvPrice : undefined);
    setText(""); setMediaFiles([]); setPpvEnabled(false); setPpvPrice(0);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };



  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) setMediaFiles((prev) => [...prev, ...files]);
    e.target.value = "";
  };

  return (
    <div style={{ borderTop: "1px solid #1E1E2E", backgroundColor: "#0D0D1A", fontFamily: "'Inter',sans-serif" }}>
      {mediaFiles.length > 0 && (
        <MediaPreviewRow files={mediaFiles} onRemove={(i) => setMediaFiles((p) => p.filter((_, idx) => idx !== i))} />
      )}
      {mediaFiles.length > 0 && (
        <PPVToggle enabled={ppvEnabled} price={ppvPrice} onToggle={setPpvEnabled} onPriceChange={setPpvPrice} />
      )}

      <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", padding: "10px 12px", minHeight: "64px" }}>
        <input ref={fileRef} type="file" accept="image/*,video/*" multiple style={{ display: "none" }} onChange={handleFileChange} />

        {/* Gallery */}
        <button
          title="Gallery"
          onClick={() => fileRef.current?.click()}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#A3A3C2", display: "flex", alignItems: "center", justifyContent: "center", padding: "7px", borderRadius: "8px", transition: "all 0.15s ease", flexShrink: 0 }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#1C1C2E"; e.currentTarget.style.color = "#FFFFFF"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#A3A3C2"; }}
        >
          <ImageIcon size={21} strokeWidth={1.8} />
        </button>

        {/* Tip — cash icon */}
        <button
          title="Tip"
          onClick={() => {}}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#F5A623", display: "flex", alignItems: "center", justifyContent: "center", padding: "7px", borderRadius: "8px", transition: "all 0.15s ease", flexShrink: 0 }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#1C1C2E"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
        >
          <Banknote size={21} strokeWidth={1.8} />
        </button>

        {/* GIF */}
        <button
          title="GIF"
          onClick={() => {}}
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: "5px 6px", borderRadius: "8px", transition: "all 0.15s ease", flexShrink: 0 }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#1C1C2E"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
        >
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#A3A3C2", letterSpacing: "0.5px", lineHeight: 1, fontFamily: "'Inter',sans-serif" }}>GIF</span>
        </button>

        {/* Message input — auto-growing textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
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
          }}
        />

        {/* Send */}
        <button
          onClick={handleSend}
          disabled={!canSend}
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