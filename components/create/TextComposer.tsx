"use client";

import React, { useState, useEffect, useRef } from "react";

const BG_OPTIONS = [
  { id: "dark",   value: "#0D0D18",                                  text: "#E2E8F0" },
  { id: "purple", value: "linear-gradient(135deg,#1e1b4b,#4c1d95)", text: "#EDE9FE" },
  { id: "blue",   value: "linear-gradient(135deg,#0f172a,#1d4ed8)", text: "#BAE6FD" },
  { id: "red",    value: "linear-gradient(135deg,#1a0000,#7f1d1d)", text: "#FEE2E2" },
  { id: "green",  value: "linear-gradient(135deg,#052e16,#14532d)", text: "#D1FAE5" },
  { id: "amber",  value: "linear-gradient(135deg,#1c1000,#78350f)", text: "#FEF3C7" },
];

interface Props {
  value:      string;
  onChange:   (text: string) => void;
  onBgChange: (bgId: string) => void;
}

export function TextComposer({ value, onChange, onBgChange }: Props) {
  const [activeBg, setActiveBg] = useState(BG_OPTIONS[0]);

  React.useEffect(() => {
    const found = BG_OPTIONS.find((bg) => bg.id === activeBg.id);
    if (found) onBgChange(found.id);
  }, []);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleBgChange = (bg: typeof BG_OPTIONS[0]) => {
    setActiveBg(bg);
    onBgChange(bg.id);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", borderRadius: "16px", overflow: "hidden" }}>

      {/* ── Compose area ─────────────────────────────────────────────── */}
      <div
        style={{
          minHeight:      "220px",
          background:     activeBg.value,
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          padding:        "28px 20px",
          position:       "relative",
          transition:     "background 0.3s",
        }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          maxLength={500}
          placeholder="Start typing…"
          rows={1}
          style={{
            width:         "100%",
            background:    "transparent",
            border:        "none",
            outline:       "none",
            resize:        "none",
            textAlign:     "center",
            fontSize:      "24px",        /* ← bigger */
            fontWeight:    600,
            lineHeight:    1.45,
            color:         activeBg.text,
            fontFamily:    "inherit",
            caretColor:    "#8B5CF6",
            letterSpacing: "-0.01em",
            overflow:      "hidden",
          }}
        />

        <span style={{
          position:   "absolute",
          bottom:     "10px",
          right:      "14px",
          fontSize:   "12px",             /* ← bigger */
          color:      "rgba(255,255,255,0.35)",  /* ← whiter */
          fontFamily: "inherit",
        }}>
          {value.length} / 500
        </span>
      </div>

      {/* ── Background picker ─────────────────────────────────────────── */}
      <div style={{
        display:         "flex",
        alignItems:      "center",
        gap:             "10px",
        padding:         "14px 16px",     /* ← slightly more padding */
        backgroundColor: "#0D0D18",
        borderTop:       "1px solid #1F1F2A",
      }}>
        <span style={{ fontSize: "12px", color: "#8A8AA0", flexShrink: 0 }}>  {/* ← bigger + whiter */}
          Background
        </span>
        {BG_OPTIONS.map((bg) => (
          <button
            key={bg.id}
            onClick={() => handleBgChange(bg)}
            style={{
              width:        "30px",         /* ← bigger swatches */
              height:       "30px",
              borderRadius: "50%",
              background:   bg.value,
              border:       activeBg.id === bg.id ? "2px solid #8B5CF6" : "2px solid transparent",
              cursor:       "pointer",
              flexShrink:   0,
              transform:    activeBg.id === bg.id ? "scale(1.2)" : "scale(1)",
              transition:   "transform 0.15s, border-color 0.15s",
              outline:      "none",
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default TextComposer;