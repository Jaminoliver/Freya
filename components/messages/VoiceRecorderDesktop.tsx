// components/messages/VoiceRecorderDesktop.tsx
"use client";

import { useEffect, useRef } from "react";
import { Mic, Trash2, Send } from "lucide-react";
import { useVoiceRecorder, type RecordResult } from "@/lib/hooks/useVoiceRecorder";

interface Props {
  onSendVoice:             (result: RecordResult) => void;
  onRecordingStateChange?: (isRecording: boolean) => void;
  disabled?:               boolean;
}

const MAX_DURATION = 120;

function formatTime(s: number): string {
  const m   = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function VoiceRecorderDesktop({ onSendVoice, onRecordingStateChange, disabled }: Props) {
  const recorder = useVoiceRecorder({
    maxDuration: MAX_DURATION,
    onStop: (result) => {
      onSendVoice(result);
    },
  });

  // Broadcast recording state on transitions
  const wasRecordingRef = useRef(false);
  useEffect(() => {
    const isRecording = recorder.state === "recording";
    if (isRecording !== wasRecordingRef.current) {
      wasRecordingRef.current = isRecording;
      onRecordingStateChange?.(isRecording);
    }
  }, [recorder.state, onRecordingStateChange]);

  // ESC key cancels active recording
  useEffect(() => {
    if (recorder.state !== "recording") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") recorder.cancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [recorder.state, recorder.cancel]);

  // ── Permission denied ─────────────────────────────────────────────────────
  if (recorder.state === "denied") {
    return (
      <button
        onClick={() => alert("Microphone access denied. Enable it in your browser settings to send voice notes.")}
        title="Microphone access denied"
        style={{
          background:     "none",
          border:         "none",
          cursor:         "pointer",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          padding:        "8px",
          borderRadius:   "8px",
          color:          "#EF4444",
        }}
      >
        <Mic size={20} strokeWidth={1.8} />
      </button>
    );
  }

  // ── Idle: just the mic button ─────────────────────────────────────────────
  if (recorder.state === "idle" || recorder.state === "requesting") {
    return (
      <button
        onClick={() => recorder.start()}
        disabled={disabled || recorder.state === "requesting"}
        title="Record voice message"
        style={{
          background:     "none",
          border:         "none",
          cursor:         disabled ? "default" : "pointer",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          padding:        "8px",
          borderRadius:   "8px",
          color:          "#A3A3C2",
          transition:     "color 0.15s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#A3A3C2")}
      >
        <Mic size={20} strokeWidth={1.8} />
      </button>
    );
  }

  // ── Recording: full-bar overlay ───────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes _vrdRedPulse  { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes _vrdSlideIn   { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .vrd-icon-btn { -webkit-tap-highlight-color: transparent; transition: background-color 0.15s ease, color 0.15s ease; }
        .vrd-icon-btn:hover { background-color: rgba(255,255,255,0.06); }
      `}</style>
      <div
        style={{
          position:             "absolute",
          inset:                0,
          display:              "flex",
          alignItems:           "center",
          gap:                  "10px",
          padding:              "8px 12px",
          backgroundColor:      "rgba(13,13,24,0.98)",
          backdropFilter:       "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          zIndex:               4,
          animation:            "_vrdSlideIn 0.2s ease",
          fontFamily:           "'Inter', sans-serif",
        }}
      >
        {/* Cancel */}
        <button
          className="vrd-icon-btn"
          onClick={() => recorder.cancel()}
          title="Cancel (Esc)"
          style={{
            background:     "none",
            border:         "none",
            cursor:         "pointer",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            padding:        "8px",
            borderRadius:   "8px",
            color:          "#EF4444",
            flexShrink:     0,
          }}
        >
          <Trash2 size={18} strokeWidth={1.8} />
        </button>

        {/* Live waveform + timer */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
          <div
            style={{
              width:           "8px",
              height:          "8px",
              borderRadius:    "50%",
              backgroundColor: "#EF4444",
              animation:       "_vrdRedPulse 1.2s ease-in-out infinite",
              flexShrink:      0,
            }}
          />
          <span
            style={{
              fontSize:           "13px",
              color:              "#FFFFFF",
              fontVariantNumeric: "tabular-nums",
              flexShrink:         0,
              minWidth:           "44px",
            }}
          >
            {formatTime(recorder.duration)}
          </span>
          <LiveLevelBar level={recorder.level} />
          <span
            style={{
              fontSize:    "11px",
              color:       "#4A4A6A",
              flexShrink:  0,
            }}
          >
            {Math.max(0, Math.floor(MAX_DURATION - recorder.duration))}s left
          </span>
        </div>

        {/* Send */}
        <button
          onClick={() => recorder.stop()}
          title="Send"
          style={{
            width:           "40px",
            height:          "40px",
            borderRadius:    "50%",
            backgroundColor: "#8B5CF6",
            border:          "none",
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "center",
            color:           "#FFFFFF",
            cursor:          "pointer",
            flexShrink:      0,
            transition:      "background-color 0.15s ease, transform 0.12s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#7C3AED"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#8B5CF6"; }}
        >
          <Send size={18} strokeWidth={1.8} />
        </button>
      </div>
    </>
  );
}

// ── Live level bar (mirrors mobile) ───────────────────────────────────────────
function LiveLevelBar({ level }: { level: number }) {
  const bars = Array.from({ length: 18 }, (_, i) => {
    const variance = ((i * 7 + 3) % 5) / 4;
    const h        = Math.max(0.15, Math.min(1, level * (0.6 + variance * 0.8)));
    return h;
  });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "2px", flex: 1, minWidth: 0, height: "22px" }}>
      {bars.map((h, i) => (
        <div
          key={i}
          style={{
            flex:            1,
            height:          `${h * 100}%`,
            backgroundColor: "#8B5CF6",
            borderRadius:    "1px",
            transition:      "height 0.08s ease",
            opacity:         0.5 + h * 0.5,
          }}
        />
      ))}
    </div>
  );
}