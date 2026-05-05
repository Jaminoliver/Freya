// components/messages/VoiceRecorderMobile.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Trash2, Lock, ChevronUp, Send, X } from "lucide-react";
import { useVoiceRecorder, type RecordResult } from "@/lib/hooks/useVoiceRecorder";

interface Props {
  onSendVoice:             (result: RecordResult) => void;
  onRecordingStateChange?: (isRecording: boolean) => void;
  disabled?:               boolean;
}

const CANCEL_THRESHOLD = 100;  // px
const LOCK_THRESHOLD   = 70;   // px
const MAX_DURATION     = 120;  // seconds

type Phase = "idle" | "holding" | "locked";

function formatTime(s: number): string {
  const m   = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function VoiceRecorderMobile({ onSendVoice, onRecordingStateChange, disabled }: Props) {
  const [phase,  setPhase]  = useState<Phase>("idle");
  const [slideX, setSlideX] = useState(0);
  const [slideY, setSlideY] = useState(0);

  const startPosRef = useRef({ x: 0, y: 0 });

  const recorder = useVoiceRecorder({
    maxDuration: MAX_DURATION,
    onStop: (result) => {
      onSendVoice(result);
      setPhase("idle");
      setSlideX(0);
      setSlideY(0);
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

  const willCancel = phase === "holding" && slideX <= -CANCEL_THRESHOLD;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    e.preventDefault();
    const t = e.touches[0];
    startPosRef.current = { x: t.clientX, y: t.clientY };
    setSlideX(0);
    setSlideY(0);
    setPhase("holding");
    recorder.start();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (phase !== "holding") return;
    const t  = e.touches[0];
    const dx = t.clientX - startPosRef.current.x;
    const dy = t.clientY - startPosRef.current.y;

    // Only track leftward and upward
    setSlideX(Math.min(0, Math.max(-150, dx)));
    setSlideY(Math.min(0, Math.max(-LOCK_THRESHOLD - 10, dy)));

    if (dy <= -LOCK_THRESHOLD) {
      setPhase("locked");
      setSlideX(0);
      setSlideY(0);
    }
  };

  const handleTouchEnd = () => {
    if (phase !== "holding") return;
    if (slideX <= -CANCEL_THRESHOLD) {
      recorder.cancel();
      setPhase("idle");
      setSlideX(0);
      setSlideY(0);
    } else {
      recorder.stop(); // onStop callback fires onSendVoice
    }
  };

  // ── Permission denied state ───────────────────────────────────────────────
  if (recorder.state === "denied") {
    return (
      <button
        onClick={() => alert("Microphone access denied. Enable it in your browser settings to send voice notes.")}
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
  if (phase === "idle") {
    return (
      <button
        onTouchStart={handleTouchStart}
        disabled={disabled}
        style={{
          background:          "none",
          border:              "none",
          cursor:              "pointer",
          display:             "flex",
          alignItems:          "center",
          justifyContent:      "center",
          padding:             "8px",
          borderRadius:        "8px",
          color:               "#A3A3C2",
          touchAction:         "none",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        <Mic size={20} strokeWidth={1.8} />
      </button>
    );
  }

  // ── Holding: full overlay + invisible mic button still receives touches ──
  if (phase === "holding") {
    const lockProgress   = Math.min(1, Math.abs(slideY) / LOCK_THRESHOLD);
    const cancelProgress = Math.min(1, Math.abs(slideX) / CANCEL_THRESHOLD);

    return (
      <>
        <style>{`
          @keyframes _vrmRedPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
          @keyframes _vrmMicPulse {
            0%,100% { transform: scale(1);    box-shadow: 0 0 0 0 rgba(139,92,246,0.5); }
            50%     { transform: scale(1.08); box-shadow: 0 0 0 12px rgba(139,92,246,0); }
          }
          @keyframes _vrmSlideHint {
            0%,100% { transform: translateX(0);    opacity: 0.6; }
            50%     { transform: translateX(-6px); opacity: 1;   }
          }
        `}</style>

        {/* Lock indicator floating above mic */}
        <div
          style={{
            position:        "absolute",
            right:           "10px",
            bottom:          "60px",
            display:         "flex",
            flexDirection:   "column",
            alignItems:      "center",
            gap:             "4px",
            padding:         "8px 6px",
            backgroundColor: "rgba(8,8,18,0.92)",
            border:          "1px solid rgba(255,255,255,0.08)",
            borderRadius:    "999px",
            opacity:         0.9 + lockProgress * 0.1,
            transform:       `translateY(${-lockProgress * 8}px) scale(${0.9 + lockProgress * 0.2})`,
            transition:      "transform 0.15s ease",
            pointerEvents:   "none",
            zIndex:          5,
          }}
        >
          <ChevronUp size={14} color={lockProgress > 0.5 ? "#8B5CF6" : "rgba(255,255,255,0.5)"} strokeWidth={2.2} />
          <Lock      size={16} color={lockProgress > 0.5 ? "#8B5CF6" : "rgba(255,255,255,0.7)"} strokeWidth={1.8} />
        </div>

        {/* Recording overlay covering input bar */}
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
            pointerEvents:        "none",
          }}
        >
          {/* Trash + slide-to-cancel indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, opacity: 1 - cancelProgress * 0.3 }}>
            <Trash2
              size={18}
              color={willCancel ? "#EF4444" : "#A3A3C2"}
              strokeWidth={1.8}
              style={{ transform: `scale(${1 + cancelProgress * 0.4})`, transition: "transform 0.1s ease" }}
            />
            {!willCancel && (
              <span
                style={{
                  fontSize:   "13px",
                  color:      "#A3A3C2",
                  fontFamily: "'Inter', sans-serif",
                  animation:  "_vrmSlideHint 1.4s ease-in-out infinite",
                }}
              >
                ← Slide to cancel
              </span>
            )}
            {willCancel && (
              <span style={{ fontSize: "13px", color: "#EF4444", fontWeight: 600 }}>Release to cancel</span>
            )}
          </div>

          {/* Timer + red dot */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
            <div
              style={{
                width:           "8px",
                height:          "8px",
                borderRadius:    "50%",
                backgroundColor: "#EF4444",
                animation:       "_vrmRedPulse 1.2s ease-in-out infinite",
              }}
            />
            <span style={{ fontSize: "13px", color: "#FFFFFF", fontFamily: "'Inter', sans-serif", fontVariantNumeric: "tabular-nums" }}>
              {formatTime(recorder.duration)}
            </span>
          </div>
        </div>

        {/* Invisible touch target — same position as the mic button */}
        <button
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          style={{
            position:                "absolute",
            right:                   "8px",
            bottom:                  "8px",
            width:                   "44px",
            height:                  "44px",
            borderRadius:            "50%",
            background:              "#8B5CF6",
            border:                  "none",
            display:                 "flex",
            alignItems:              "center",
            justifyContent:          "center",
            color:                   "#FFFFFF",
            cursor:                  "pointer",
            touchAction:             "none",
            WebkitTapHighlightColor: "transparent",
            animation:               "_vrmMicPulse 1.2s ease-in-out infinite",
            zIndex:                  6,
          }}
        >
          <Mic size={20} strokeWidth={1.8} />
        </button>
      </>
    );
  }

  // ── Locked: hands-free recording with cancel + send buttons ──────────────
  return (
    <>
      <style>{`
        @keyframes _vrmRedPulse2 { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
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
        }}
      >
        {/* Cancel button */}
        <button
          onClick={() => { recorder.cancel(); setPhase("idle"); }}
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
          <X size={20} strokeWidth={1.8} />
        </button>

        {/* Live waveform (single bar reflecting current level) */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
          <div
            style={{
              width:           "8px",
              height:          "8px",
              borderRadius:    "50%",
              backgroundColor: "#EF4444",
              animation:       "_vrmRedPulse2 1.2s ease-in-out infinite",
              flexShrink:      0,
            }}
          />
          <span
            style={{
              fontSize:           "13px",
              color:              "#FFFFFF",
              fontFamily:         "'Inter', sans-serif",
              fontVariantNumeric: "tabular-nums",
              flexShrink:         0,
            }}
          >
            {formatTime(recorder.duration)}
          </span>
          <LiveLevelBar level={recorder.level} />
        </div>

        {/* Send button */}
        <button
          onClick={() => recorder.stop()}
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
          }}
        >
          <Send size={18} strokeWidth={1.8} />
        </button>
      </div>
    </>
  );
}

// ── Tiny live-level bar (8 bars that scale with current input level) ─────────
function LiveLevelBar({ level }: { level: number }) {
  // Generate 12 pseudo-random bar heights based on level
  const bars = Array.from({ length: 12 }, (_, i) => {
    const variance = ((i * 7 + 3) % 5) / 4; // deterministic 0–1
    const h = Math.max(0.15, Math.min(1, level * (0.6 + variance * 0.8)));
    return h;
  });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "2px", flex: 1, minWidth: 0, height: "20px" }}>
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