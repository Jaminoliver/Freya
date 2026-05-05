// components/messages/VoiceRecorderMobile.tsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Trash2, Send, Lock, ChevronUp } from "lucide-react";
import { useVoiceRecorder, type RecordResult } from "@/lib/hooks/useVoiceRecorder";

interface Props {
  onSendVoice:             (result: RecordResult) => void;
  onRecordingStateChange?: (isRecording: boolean) => void;
  disabled?:               boolean;
}

const CANCEL_THRESHOLD = 80;   // px left to cancel
const LOCK_THRESHOLD   = 60;   // px up to lock
const MAX_DURATION     = 120;  // seconds
const TAP_THRESHOLD    = 500;  // ms — under this = tap → lock mode

function formatTime(s: number): string {
  const m   = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

// ── Real-time scrolling waveform using Web Audio API ─────────────────────────
function ScrollingWaveform({ analyser }: { analyser: AnalyserNode | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const barsRef   = useRef<number[]>([]);
  const rafRef    = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx    = canvas.getContext("2d");
    if (!ctx)    return;

    const BAR_W   = 3;
    const BAR_GAP = 2;
    const MAX_H   = canvas.height * 0.85;
    const MIN_H   = canvas.height * 0.08;
    const TOTAL_W = canvas.width;
    const maxBars = Math.floor(TOTAL_W / (BAR_W + BAR_GAP));

    let lastPushTime = 0;
    const PUSH_INTERVAL = 80; // ms between bar pushes

    const dataArray = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

    const draw = (now: number) => {
      rafRef.current = requestAnimationFrame(draw);

      // Get current audio level
      let level = 0;
      if (analyser && dataArray) {
        analyser.getByteFrequencyData(dataArray);
        // Use lower-mid frequencies (voice range ~200-3000hz)
        const start = Math.floor(dataArray.length * 0.02);
        const end   = Math.floor(dataArray.length * 0.35);
        let sum = 0;
        for (let i = start; i < end; i++) sum += dataArray[i];
        level = sum / ((end - start) * 255);
      }

      // Push a new bar periodically
      if (now - lastPushTime >= PUSH_INTERVAL) {
        lastPushTime = now;
        const jitter = (Math.random() - 0.5) * 0.1;
        const h = analyser
          ? Math.max(MIN_H, Math.min(MAX_H, (level + jitter) * MAX_H * 1.4))
          : MIN_H;
        barsRef.current.push(h);
        if (barsRef.current.length > maxBars) barsRef.current.shift();
      }

      // Draw
      ctx.clearRect(0, 0, TOTAL_W, canvas.height);
      const bars = barsRef.current;
      const cy   = canvas.height / 2;

      bars.forEach((barH, i) => {
        const x        = i * (BAR_W + BAR_GAP);
        const halfH    = barH / 2;
        const progress = i / (maxBars - 1 || 1);
        // Fade in from left, full opacity on right
        const alpha = 0.3 + progress * 0.7;

        ctx.globalAlpha = alpha;
        ctx.fillStyle   = "#8B5CF6";

        // Rounded bars
        const radius = BAR_W / 2;
        const y      = cy - halfH;
        const h      = barH;

        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + BAR_W - radius, y);
        ctx.quadraticCurveTo(x + BAR_W, y, x + BAR_W, y + radius);
        ctx.lineTo(x + BAR_W, y + h - radius);
        ctx.quadraticCurveTo(x + BAR_W, y + h, x + BAR_W - radius, y + h);
        ctx.lineTo(x + radius, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
      });

      ctx.globalAlpha = 1;
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyser]);

  return (
    <canvas
      ref={canvasRef}
      width={220}
      height={36}
      style={{ flex: 1, maxWidth: "100%", display: "block" }}
    />
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
type Phase = "idle" | "holding" | "locked";

export function VoiceRecorderMobile({ onSendVoice, onRecordingStateChange, disabled }: Props) {
  const [phase,     setPhase]     = useState<Phase>("idle");
  const [slideX,    setSlideX]    = useState(0);
  const [slideY,    setSlideY]    = useState(0);
  const [analyser,  setAnalyser]  = useState<AnalyserNode | null>(null);
  const [showLockPop, setShowLockPop] = useState(false);

  const startPosRef   = useRef({ x: 0, y: 0 });
  const touchDownTime = useRef(0);
  const phaseRef      = useRef<Phase>("idle");
  const slideXRef     = useRef(0);
const holdTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep phaseRef in sync
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const recorder = useVoiceRecorder({
    maxDuration: MAX_DURATION,
    onStop: (result) => {
      onSendVoice(result);
      setPhase("idle");
      setSlideX(0);
      setSlideY(0);
      setAnalyser(null);
    },
  });

  // Broadcast recording state
  const wasRecordingRef = useRef(false);
  useEffect(() => {
    const isRecording = recorder.state === "recording";
    if (isRecording !== wasRecordingRef.current) {
      wasRecordingRef.current = isRecording;
      onRecordingStateChange?.(isRecording);
    }
  }, [recorder.state, onRecordingStateChange]);

  // Build analyser from stream once recording starts
  useEffect(() => {
    if (recorder.state !== "recording") { setAnalyser(null); return; }
    const stream = (recorder as any).stream as MediaStream | undefined;
    if (!stream) return;
    try {
      const ctx  = new AudioContext();
      const src  = ctx.createMediaStreamSource(stream);
      const node = ctx.createAnalyser();
      node.fftSize            = 256;
      node.smoothingTimeConstant = 0.75;
      src.connect(node);
      setAnalyser(node);
      return () => { ctx.close(); setAnalyser(null); };
    } catch { setAnalyser(null); }
  }, [recorder.state]);

  const doStart = useCallback(async () => {
    await recorder.start();
  }, [recorder]);

  const doLock = useCallback(() => {
    setPhase("locked");
    setSlideX(0);
    setSlideY(0);
    setShowLockPop(true);
    setTimeout(() => setShowLockPop(false), 700);
  }, []);

  const doCancel = useCallback(() => {
    recorder.cancel();
    setPhase("idle");
    setSlideX(0);
    setSlideY(0);
    setAnalyser(null);
  }, [recorder]);

  const doSend = useCallback(() => {
    recorder.stop();
  }, [recorder]);

  // ── Touch handlers ──────────────────────────────────────────────────────────
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    const t = e.touches[0];
    startPosRef.current = { x: t.clientX, y: t.clientY };
    slideXRef.current   = 0;
    touchDownTime.current = Date.now();
    setSlideX(0);
    setSlideY(0);
    holdTimerRef.current = setTimeout(() => setPhase("holding"), TAP_THRESHOLD);
    doStart();
  }, [disabled, doStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (phaseRef.current !== "holding") return;
    e.preventDefault();
    const t  = e.touches[0];
    const dx = t.clientX - startPosRef.current.x;
    const dy = t.clientY - startPosRef.current.y;

    const clampedX = Math.min(0, Math.max(-160, dx));
    const clampedY = Math.min(0, Math.max(-LOCK_THRESHOLD - 20, dy));

    slideXRef.current = clampedX;
    setSlideX(clampedX);
    setSlideY(clampedY);

    // Auto-lock when swiped up enough
    if (dy <= -LOCK_THRESHOLD) {
      doLock();
    }
  }, [doLock]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (phaseRef.current !== "holding") return;
    e.preventDefault();

    const elapsed = Date.now() - touchDownTime.current;
    const isQuickTap = elapsed < TAP_THRESHOLD && Math.abs(slideXRef.current) < 10;

    if (isQuickTap) {
      // Single tap → lock mode
      doLock();
      return;
    }

    if (slideXRef.current <= -CANCEL_THRESHOLD) {
      doCancel();
    } else {
      doSend();
    }
  }, [doLock, doCancel, doSend]);

  const willCancel = phase === "holding" && slideX <= -CANCEL_THRESHOLD;
  const cancelProgress = Math.min(1, Math.abs(slideX) / CANCEL_THRESHOLD);
  const lockProgress   = Math.min(1, Math.abs(slideY) / LOCK_THRESHOLD);

  // ── Permission denied ───────────────────────────────────────────────────────
  if (recorder.state === "denied") {
    return (
      <button
        onClick={() => alert("Microphone access denied. Enable it in your browser settings.")}
        style={btnBase("#EF4444")}
      >
        <Mic size={20} strokeWidth={1.8} />
      </button>
    );
  }

  // ── Idle ────────────────────────────────────────────────────────────────────
  if (phase === "idle") {
    return (
      <>
        <GlobalStyles />
        <button
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          disabled={disabled}
          className="vrm-no-callout"
          style={btnBase("#A3A3C2")}
        >
          <Mic size={20} strokeWidth={1.8} />
        </button>
      </>
    );
  }

  // ── Holding ─────────────────────────────────────────────────────────────────
  if (phase === "holding") {
    return (
      <>
        <GlobalStyles />

        {/* Lock chevron indicator */}
        <div
          style={{
            position:      "absolute",
            right:         "14px",
            bottom:        "68px",
            display:       "flex",
            flexDirection: "column",
            alignItems:    "center",
            gap:           "2px",
            opacity:       0.4 + lockProgress * 0.6,
            transform:     `translateY(${-lockProgress * 10}px) scale(${0.85 + lockProgress * 0.25})`,
            transition:    "transform 0.12s ease, opacity 0.12s ease",
            pointerEvents: "none",
            zIndex:        10,
          }}
        >
          <ChevronUp
            size={15}
            strokeWidth={2.5}
            color={lockProgress > 0.6 ? "#8B5CF6" : "rgba(255,255,255,0.45)"}
            style={{ transition: "color 0.15s ease" }}
          />
          <div
            style={{
              width:           "28px",
              height:          "28px",
              borderRadius:    "50%",
              backgroundColor: lockProgress > 0.6 ? "rgba(139,92,246,0.25)" : "rgba(255,255,255,0.06)",
              border:          `1.5px solid ${lockProgress > 0.6 ? "#8B5CF6" : "rgba(255,255,255,0.2)"}`,
              display:         "flex",
              alignItems:      "center",
              justifyContent:  "center",
              transition:      "all 0.15s ease",
            }}
          >
            <Lock size={13} strokeWidth={2} color={lockProgress > 0.6 ? "#8B5CF6" : "rgba(255,255,255,0.5)"} />
          </div>
        </div>

        {/* Overlay */}
        <div
          style={{
            position:             "absolute",
            inset:                0,
            display:              "flex",
            alignItems:           "center",
            gap:                  "8px",
            padding:              "0 12px 0 10px",
            backgroundColor:      "rgba(10,10,20,0.97)",
            backdropFilter:       "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            zIndex:               4,
            pointerEvents:        "none",
            animation:            "vrmFadeIn 0.15s ease",
          }}
        >
          {/* Trash icon — grows as you slide */}
          <div
            style={{
              transform:  `scale(${1 + cancelProgress * 0.5})`,
              transition: "transform 0.08s ease",
              flexShrink: 0,
            }}
          >
            <Trash2
              size={18}
              strokeWidth={1.8}
              color={willCancel ? "#EF4444" : `rgba(163,163,194,${0.5 + cancelProgress * 0.5})`}
              style={{ transition: "color 0.12s ease" }}
            />
          </div>

          {/* Slide to cancel text */}
          <div style={{ flex: 1, overflow: "hidden" }}>
            {willCancel ? (
              <span style={{ fontSize: "12px", color: "#EF4444", fontWeight: 700, fontFamily: "'Inter', sans-serif", animation: "vrmFadeIn 0.1s ease" }}>
                Release to cancel
              </span>
            ) : (
              <span
                style={{
                  fontSize:   "12px",
                  color:      `rgba(163,163,194,${1 - cancelProgress * 0.5})`,
                  fontFamily: "'Inter', sans-serif",
                  display:    "flex",
                  alignItems: "center",
                  gap:        "4px",
                  animation:  "vrmSlideHint 1.6s ease-in-out infinite",
                }}
              >
                <span style={{ fontSize: "11px" }}>←</span> Slide to cancel
              </span>
            )}
          </div>

          {/* Timer + pulse dot */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
            <div style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: "#EF4444", animation: "vrmPulse 1.1s ease-in-out infinite" }} />
            <span style={{ fontSize: "13px", color: "#FFFFFF", fontFamily: "'Inter', sans-serif", fontVariantNumeric: "tabular-nums", minWidth: "36px" }}>
              {formatTime(recorder.duration)}
            </span>
          </div>
        </div>

        {/* Invisible touch receiver — stays on top */}
        <button
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          className="vrm-no-callout"
          style={{
            position:                "absolute",
            right:                   "8px",
            bottom:                  "8px",
            width:                   "44px",
            height:                  "44px",
            borderRadius:            "50%",
            background:              willCancel ? "#EF4444" : "#8B5CF6",
            border:                  "none",
            display:                 "flex",
            alignItems:              "center",
            justifyContent:          "center",
            color:                   "#FFFFFF",
            cursor:                  "pointer",
            touchAction:             "none",
            WebkitTapHighlightColor: "transparent",
            animation:               "vrmMicPulse 1.3s ease-in-out infinite",
            zIndex:                  6,
            transition:              "background 0.15s ease",
            boxShadow:               willCancel
              ? "0 0 0 8px rgba(239,68,68,0.12)"
              : "0 0 0 8px rgba(139,92,246,0.12)",
          }}
        >
          <Mic size={20} strokeWidth={1.8} />
        </button>
      </>
    );
  }

  // ── Locked ──────────────────────────────────────────────────────────────────
  return (
    <>
      <GlobalStyles />

      {/* Lock pop confirmation */}
      {showLockPop && (
        <div
          style={{
            position:      "absolute",
            right:         "14px",
            bottom:        "68px",
            pointerEvents: "none",
            zIndex:        20,
            animation:     "vrmLockPop 0.6s ease forwards",
          }}
        >
          <div
            style={{
              width:           "32px",
              height:          "32px",
              borderRadius:    "50%",
              backgroundColor: "rgba(139,92,246,0.3)",
              border:          "1.5px solid #8B5CF6",
              display:         "flex",
              alignItems:      "center",
              justifyContent:  "center",
            }}
          >
            <Lock size={14} strokeWidth={2} color="#8B5CF6" />
          </div>
        </div>
      )}

      <div
        style={{
          position:             "absolute",
          inset:                0,
          display:              "flex",
          alignItems:           "center",
          gap:                  "8px",
          padding:              "0 10px",
          backgroundColor:      "rgba(10,10,20,0.97)",
          backdropFilter:       "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          zIndex:               4,
          animation:            "vrmFadeIn 0.18s ease",
        }}
      >
        {/* Cancel */}
        <button
          onClick={doCancel}
          className="vrm-no-callout"
          style={{
            background:              "none",
            border:                  "none",
            cursor:                  "pointer",
            display:                 "flex",
            alignItems:              "center",
            justifyContent:          "center",
            padding:                 "8px",
            borderRadius:            "8px",
            color:                   "#EF4444",
            flexShrink:              0,
            WebkitTapHighlightColor: "transparent",
            touchAction:             "manipulation",
          }}
        >
          <Trash2 size={19} strokeWidth={1.8} />
        </button>

        {/* Waveform + timer */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "7px", minWidth: 0, overflow: "hidden" }}>
          <div style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: "#EF4444", flexShrink: 0, animation: "vrmPulse 1.1s ease-in-out infinite" }} />
          <span style={{ fontSize: "13px", color: "#FFFFFF", fontFamily: "'Inter', sans-serif", fontVariantNumeric: "tabular-nums", flexShrink: 0, minWidth: "36px" }}>
            {formatTime(recorder.duration)}
          </span>
          <ScrollingWaveform analyser={analyser} />
        </div>

        {/* Send */}
        <button
          onClick={doSend}
          className="vrm-no-callout"
          style={{
            width:                   "38px",
            height:                  "38px",
            borderRadius:            "50%",
            backgroundColor:         "#8B5CF6",
            border:                  "none",
            display:                 "flex",
            alignItems:              "center",
            justifyContent:          "center",
            color:                   "#FFFFFF",
            cursor:                  "pointer",
            flexShrink:              0,
            WebkitTapHighlightColor: "transparent",
            touchAction:             "manipulation",
            boxShadow:               "0 0 0 6px rgba(139,92,246,0.15)",
          }}
        >
          <Send size={17} strokeWidth={2} />
        </button>
      </div>
    </>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function btnBase(color: string): React.CSSProperties {
  return {
    background:              "none",
    border:                  "none",
    cursor:                  "pointer",
    display:                 "flex",
    alignItems:              "center",
    justifyContent:          "center",
    padding:                 "8px",
    borderRadius:            "8px",
    color,
    touchAction:             "none",
    WebkitTapHighlightColor: "transparent",
    userSelect:              "none",
    WebkitUserSelect:        "none",
  };
}

function GlobalStyles() {
  return (
    <style>{`
      .vrm-no-callout {
        -webkit-touch-callout: none !important;
        -webkit-user-select:   none !important;
        user-select:           none !important;
        touch-action:          none !important;
        -webkit-tap-highlight-color: transparent !important;
        outline: none !important;
      }
      @keyframes vrmFadeIn {
        from { opacity: 0; }
        to   { opacity: 1; }
      }
      @keyframes vrmPulse {
        0%,100% { opacity: 1;   transform: scale(1);    }
        50%     { opacity: 0.4; transform: scale(0.85); }
      }
      @keyframes vrmMicPulse {
        0%,100% { transform: scale(1);    box-shadow: 0 0 0 8px rgba(139,92,246,0.12); }
        50%     { transform: scale(1.07); box-shadow: 0 0 0 12px rgba(139,92,246,0.06); }
      }
      @keyframes vrmSlideHint {
        0%,100% { transform: translateX(0);    opacity: 0.7; }
        50%     { transform: translateX(-5px); opacity: 1;   }
      }
      @keyframes vrmLockPop {
        0%   { opacity: 0; transform: scale(0.6) translateY(6px); }
        40%  { opacity: 1; transform: scale(1.15) translateY(-4px); }
        70%  { transform: scale(0.95) translateY(0); }
        100% { opacity: 0; transform: scale(1) translateY(-8px); }
      }
    `}</style>
  );
}