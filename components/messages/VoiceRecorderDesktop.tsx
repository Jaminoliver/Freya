// components/messages/VoiceRecorderDesktop.tsx
"use client";

import { useEffect, useRef, useState } from "react";
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

  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  useEffect(() => {
    if (recorder.state !== "recording") { setAnalyser(null); return; }
    const stream = (recorder as any).stream as MediaStream | undefined;
    if (!stream) return;
    try {
      const actx = new AudioContext();
      const src  = actx.createMediaStreamSource(stream);
      const node = actx.createAnalyser();
      node.fftSize = 256;
      node.smoothingTimeConstant = 0.75;
      src.connect(node);
      setAnalyser(node);
      return () => { actx.close(); setAnalyser(null); };
    } catch { setAnalyser(null); }
  }, [recorder.state]);

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
          <ScrollingWaveform analyser={analyser} />
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

// ── Scrolling waveform (matches mobile) ───────────────────────────────────────
function ScrollingWaveform({ analyser }: { analyser: AnalyserNode | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const barsRef   = useRef<number[]>([]);
  const rafRef    = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const BAR_W = 3, BAR_GAP = 2;
    const MAX_H = canvas.height * 0.85, MIN_H = canvas.height * 0.08;
    const TOTAL_W = canvas.width;
    const maxBars = Math.floor(TOTAL_W / (BAR_W + BAR_GAP));
    let lastPushTime = 0;
    const dataArray = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

    const draw = (now: number) => {
      rafRef.current = requestAnimationFrame(draw);
      let level = 0;
      if (analyser && dataArray) {
        analyser.getByteFrequencyData(dataArray);
        const start = Math.floor(dataArray.length * 0.02);
        const end   = Math.floor(dataArray.length * 0.35);
        let sum = 0;
        for (let i = start; i < end; i++) sum += dataArray[i];
        level = sum / ((end - start) * 255);
      }
      if (now - lastPushTime >= 80) {
        lastPushTime = now;
        const h = analyser
          ? Math.max(MIN_H, Math.min(MAX_H, (level + (Math.random() - 0.5) * 0.1) * MAX_H * 1.4))
          : MIN_H;
        barsRef.current.push(h);
        if (barsRef.current.length > maxBars) barsRef.current.shift();
      }
      ctx.clearRect(0, 0, TOTAL_W, canvas.height);
      const cy = canvas.height / 2;
      barsRef.current.forEach((barH, i) => {
        const x = i * (BAR_W + BAR_GAP);
        const halfH = barH / 2;
        const alpha = 0.3 + (i / (maxBars - 1 || 1)) * 0.7;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#8B5CF6";
        const r = BAR_W / 2, y = cy - halfH;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + BAR_W - r, y);
        ctx.quadraticCurveTo(x + BAR_W, y, x + BAR_W, y + r);
        ctx.lineTo(x + BAR_W, y + barH - r);
        ctx.quadraticCurveTo(x + BAR_W, y + barH, x + BAR_W - r, y + barH);
        ctx.lineTo(x + r, y + barH);
        ctx.quadraticCurveTo(x, y + barH, x, y + barH - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyser]);

  return (
    <canvas ref={canvasRef} width={220} height={36}
      style={{ flex: 1, maxWidth: "100%", display: "block" }} />
  );
}