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

const CANCEL_THRESHOLD = 80;
const LOCK_THRESHOLD   = 60;
const MAX_DURATION     = 120;
const TAP_THRESHOLD    = 300;     // ms — under this = tap → locked state
const WARN_AT          = 100;     // s — time turns yellow
const URGENT_AT        = 110;     // s — time turns red + haptic

function formatTime(s: number): string {
  const m   = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function safeVibrate(ms: number) {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(ms);
    }
  } catch {}
}

// ── Scrolling waveform ────────────────────────────────────────────────────────
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

// ── Main Component ────────────────────────────────────────────────────────────
type Phase = "idle" | "holding" | "locked";

export function VoiceRecorderMobile({ onSendVoice, onRecordingStateChange, disabled }: Props) {
  const [phase,       setPhase]       = useState<Phase>("idle");
  const [slideX,      setSlideX]      = useState(0);
  const [slideY,      setSlideY]      = useState(0);
  const [analyser,    setAnalyser]    = useState<AnalyserNode | null>(null);
  const [showLockPop, setShowLockPop] = useState(false);

  const phaseRef    = useRef<Phase>("idle");
  const startPos    = useRef({ x: 0, y: 0 });
  const slideXRef   = useRef(0);
  const slideYRef   = useRef(0);
  const activeTouch    = useRef<number | null>(null);
  const touchDownTime  = useRef(0);
  const captureRef     = useRef<HTMLDivElement>(null);
  const lockPopTimerRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelHapticFiredRef  = useRef(false);
  const urgentHapticFiredRef  = useRef(false);

  // Keep phaseRef in sync
  const changePhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const recorder = useVoiceRecorder({
    maxDuration: MAX_DURATION,
    onStop: (result) => {
      onSendVoice(result);
      changePhase("idle");
      setSlideX(0);
      setSlideY(0);
      setAnalyser(null);
      activeTouch.current = null;
      cancelHapticFiredRef.current = false;
      urgentHapticFiredRef.current = false;
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

  // Build analyser
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

  // One-shot haptic when approaching MAX_DURATION
  useEffect(() => {
    if (recorder.duration >= URGENT_AT && !urgentHapticFiredRef.current) {
      urgentHapticFiredRef.current = true;
      safeVibrate(20);
    }
    if (recorder.duration < WARN_AT) urgentHapticFiredRef.current = false;
  }, [recorder.duration]);

  // Cleanup lock-pop timer on unmount
  useEffect(() => () => {
    if (lockPopTimerRef.current) clearTimeout(lockPopTimerRef.current);
  }, []);

  const doLock = useCallback(() => {
    changePhase("locked");
    setSlideX(0); setSlideY(0);
    slideXRef.current = 0; slideYRef.current = 0;
    setShowLockPop(true);
    if (lockPopTimerRef.current) clearTimeout(lockPopTimerRef.current);
    lockPopTimerRef.current = setTimeout(() => setShowLockPop(false), 700);
    safeVibrate(15);
  }, [changePhase]);

  const doCancel = useCallback(() => {
    recorder.cancel();
    changePhase("idle");
    setSlideX(0); setSlideY(0);
    setAnalyser(null);
    activeTouch.current = null;
    cancelHapticFiredRef.current = false;
  }, [recorder, changePhase]);

  const doSend = useCallback(() => {
    if (recorder.state !== "recording") {
      changePhase("idle");
      setSlideX(0); setSlideY(0);
      setAnalyser(null);
      activeTouch.current = null;
      return;
    }
    safeVibrate(8);
    recorder.stop();
    activeTouch.current = null;
  }, [recorder, changePhase]);

  const onTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || phaseRef.current !== "idle") return;
    e.preventDefault();
    const t = e.changedTouches[0];
    activeTouch.current  = t.identifier;
    touchDownTime.current = Date.now();
    startPos.current     = { x: t.clientX, y: t.clientY };
    slideXRef.current    = 0;
    slideYRef.current    = 0;
    setSlideX(0); setSlideY(0);
    cancelHapticFiredRef.current = false;
    recorder.start();
    changePhase("holding");
  }, [disabled, changePhase, recorder]);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (phaseRef.current !== "holding") return;
    const t = Array.from(e.changedTouches).find(x => x.identifier === activeTouch.current);
    if (!t) return;
    e.preventDefault();

    const dx = t.clientX - startPos.current.x;
    const dy = t.clientY - startPos.current.y;
    const clampedX = Math.min(0, Math.max(-160, dx));
    const clampedY = Math.min(0, Math.max(-LOCK_THRESHOLD - 20, dy));

    slideXRef.current = clampedX;
    slideYRef.current = clampedY;
    setSlideX(clampedX);
    setSlideY(clampedY);

    // One-shot haptic on cancel-threshold crossing (per direction)
    if (clampedX <= -CANCEL_THRESHOLD && !cancelHapticFiredRef.current) {
      cancelHapticFiredRef.current = true;
      safeVibrate(12);
    } else if (clampedX > -CANCEL_THRESHOLD && cancelHapticFiredRef.current) {
      cancelHapticFiredRef.current = false;
    }

    if (dy <= -LOCK_THRESHOLD) doLock();
  }, [doLock]);

  const onTouchEnd = useCallback((e: TouchEvent) => {
    if (phaseRef.current !== "holding") return;
    const t = Array.from(e.changedTouches).find(x => x.identifier === activeTouch.current);
    if (!t) return;
    e.preventDefault();

    // Mic permission still pending — abort cleanly
    if (recorder.state !== "recording") {
      doCancel();
      return;
    }

    const elapsed = Date.now() - touchDownTime.current;
    const isTap   = elapsed < TAP_THRESHOLD && Math.abs(slideXRef.current) < 10;

    if (isTap) { doLock(); return; }
    if (slideXRef.current <= -CANCEL_THRESHOLD) { doCancel(); return; }
    if (recorder.duration < 1) { doCancel(); return; }
    doSend();
  }, [doLock, doCancel, doSend, recorder.state, recorder.duration]);

  // ── Imperative touch listeners (passive: false required for preventDefault) ─
  useEffect(() => {
    const el = captureRef.current;
    if (!el) return;
    const opts = { passive: false };
    el.addEventListener("touchstart",  onTouchStart as any, opts);
    el.addEventListener("touchmove",   onTouchMove  as any, opts);
    el.addEventListener("touchend",    onTouchEnd   as any, opts);
    el.addEventListener("touchcancel", onTouchEnd   as any, opts);
    return () => {
      el.removeEventListener("touchstart",  onTouchStart as any);
      el.removeEventListener("touchmove",   onTouchMove  as any);
      el.removeEventListener("touchend",    onTouchEnd   as any);
      el.removeEventListener("touchcancel", onTouchEnd   as any);
    };
  }, [onTouchStart, onTouchMove, onTouchEnd, phase]);

  // ── Derived UI values ─────────────────────────────────────────────────────
  const willCancel     = phase === "holding" && slideX <= -CANCEL_THRESHOLD;
  const cancelProgress = Math.min(1, Math.abs(slideX) / CANCEL_THRESHOLD);
  const lockProgress   = Math.min(1, Math.abs(slideY) / LOCK_THRESHOLD);
  const isRequesting   = recorder.state === "requesting";

  // Duration warning state
  const inWarnZone   = recorder.duration >= WARN_AT && recorder.duration < URGENT_AT;
  const inUrgentZone = recorder.duration >= URGENT_AT;
  const timeColor    = inUrgentZone ? "#EF4444" : inWarnZone ? "#F59E0B" : "#FFFFFF";

  if (recorder.state === "denied") {
    return (
      <button onClick={() => alert("Microphone access denied. Enable it in your browser settings.")}
        style={btnBase("#EF4444")}>
        <Mic size={20} strokeWidth={1.8} />
      </button>
    );
  }

  return (
    <>
      <GlobalStyles />

      {/* ── Lock pop ── */}
      {showLockPop && (
        <div style={{ position: "absolute", right: "14px", bottom: "68px", pointerEvents: "none", zIndex: 20, animation: "vrmLockPop 0.6s ease forwards" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "rgba(139,92,246,0.3)", border: "1.5px solid #8B5CF6", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Lock size={14} strokeWidth={2} color="#8B5CF6" />
          </div>
        </div>
      )}

      {/* ── Idle mic icon ── */}
      {phase === "idle" && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "44px", height: "44px", color: "#A3A3C2", pointerEvents: "none", animation: "vrmIdleFadeIn 0.18s ease both" }}>
          <Mic size={20} strokeWidth={1.8} />
        </div>
      )}

      {/* ── Holding overlay ── */}
      {phase === "holding" && (
        <>
          {/* Lock chevron — bobs to invite slide-up gesture */}
          <div style={{ position: "absolute", right: "14px", bottom: "68px", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", opacity: 0.4 + lockProgress * 0.6, transform: `translateY(${-lockProgress * 10}px) scale(${0.85 + lockProgress * 0.25})`, transition: "transform 0.12s ease, opacity 0.12s ease", pointerEvents: "none", zIndex: 10, animation: "vrmFadeIn 0.15s ease 0.2s both" }}>
            <div className={lockProgress < 0.1 ? "vrm-chevron-bob" : ""}>
              <ChevronUp size={15} strokeWidth={2.5} color={lockProgress > 0.6 ? "#8B5CF6" : "rgba(255,255,255,0.45)"} style={{ transition: "color 0.15s ease" }} />
            </div>
            <div style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: lockProgress > 0.6 ? "rgba(139,92,246,0.25)" : "rgba(255,255,255,0.06)", border: `1.5px solid ${lockProgress > 0.6 ? "#8B5CF6" : "rgba(255,255,255,0.2)"}`, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s ease" }}>
              <Lock size={13} strokeWidth={2} color={lockProgress > 0.6 ? "#8B5CF6" : "rgba(255,255,255,0.5)"} />
            </div>
          </div>

          {/* Slide to cancel bar */}
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", gap: "8px", padding: "0 12px 0 10px", backgroundColor: "rgba(10,10,20,0.97)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", zIndex: 4, pointerEvents: "none", animation: "vrmFadeIn 0.15s ease 0.2s both" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
              <div style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: "#EF4444", animation: "vrmHeartbeat 1.4s ease-in-out infinite" }} />
              <span style={{ fontSize: "13px", color: timeColor, fontFamily: "'Inter', sans-serif", fontVariantNumeric: "tabular-nums", minWidth: "36px", transition: "color 0.2s ease", fontWeight: inUrgentZone ? 700 : 400 }}>
                {isRequesting ? "..." : formatTime(recorder.duration)}
              </span>
            </div>
            <div style={{ flex: 1, overflow: "hidden", display: "flex", justifyContent: "center" }}>
              {willCancel
                ? <span style={{ fontSize: "12px", color: "#EF4444", fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>Release to cancel</span>
                : <span style={{ fontSize: "12px", color: `rgba(163,163,194,${1 - cancelProgress * 0.5})`, fontFamily: "'Inter', sans-serif", display: "flex", alignItems: "center", gap: "4px", animation: "vrmSlideHint 1.6s ease-in-out infinite" }}>
                    <span style={{ fontSize: "11px" }}>←</span> Slide to cancel
                  </span>
              }
            </div>
          </div>

          {/* Mic button visual — translates with finger during slide */}
          <div style={{ position: "absolute", right: "8px", bottom: "8px", transform: `translateX(${slideX * 0.5}px)`, transition: "transform 0.05s linear", zIndex: 5, pointerEvents: "none" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: willCancel ? "#EF4444" : "#8B5CF6", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFFFFF", animation: "vrmMicPulse 1.3s ease-in-out 0.2s infinite", transition: "background 0.15s ease", boxShadow: willCancel ? "0 0 0 8px rgba(239,68,68,0.12)" : "0 0 0 8px rgba(139,92,246,0.12)" }}>
              <Mic size={20} strokeWidth={1.8} />
            </div>
          </div>
        </>
      )}

      {/* ── Locked overlay ── */}
      {phase === "locked" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", gap: "8px", padding: "0 10px", backgroundColor: "rgba(10,10,20,0.97)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", zIndex: 4, animation: "vrmLockedIn 0.22s cubic-bezier(0.34,1.56,0.64,1)", transformOrigin: "right center" }}>
          <button onClick={doCancel} className="vrm-no-callout vrm-press-btn" style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: "8px", borderRadius: "8px", color: "#EF4444", flexShrink: 0, WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}>
            <Trash2 size={19} strokeWidth={1.8} />
          </button>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "7px", minWidth: 0, overflow: "hidden" }}>
            <div style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: "#EF4444", flexShrink: 0, animation: "vrmHeartbeat 1.4s ease-in-out infinite" }} />
            <span style={{ fontSize: "13px", color: timeColor, fontFamily: "'Inter', sans-serif", fontVariantNumeric: "tabular-nums", flexShrink: 0, minWidth: "36px", transition: "color 0.2s ease", fontWeight: inUrgentZone ? 700 : 400 }}>
              {isRequesting ? "..." : formatTime(recorder.duration)}
            </span>
            <ScrollingWaveform analyser={analyser} />
          </div>
          <button onClick={doSend} className="vrm-no-callout vrm-press-btn" style={{ width: "38px", height: "38px", borderRadius: "50%", background: "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFFFFF", cursor: "pointer", flexShrink: 0, WebkitTapHighlightColor: "transparent", touchAction: "manipulation", boxShadow: "0 0 0 6px rgba(139,92,246,0.15)" }}>
            <Send size={17} strokeWidth={2} />
          </button>
        </div>
      )}

      {/* ── Persistent touch capture div — ALWAYS mounted, ALWAYS on top ── */}
      {phase !== "locked" && (
        <div
          ref={captureRef}
          className="vrm-no-callout"
          style={{
            position:                "absolute",
            right:                   "8px",
            bottom:                  "8px",
            width:                   "44px",
            height:                  "44px",
            borderRadius:            "50%",
            zIndex:                  10,
            touchAction:             "none",
            WebkitTapHighlightColor: "transparent",
            cursor:                  disabled ? "default" : "pointer",
          }}
        />
      )}
    </>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function btnBase(color: string): React.CSSProperties {
  return {
    background: "none", border: "none", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "8px", borderRadius: "8px", color,
    touchAction: "none", WebkitTapHighlightColor: "transparent",
    userSelect: "none", WebkitUserSelect: "none",
  } as React.CSSProperties;
}

function GlobalStyles() {
  return (
    <style>{`
      .vrm-no-callout {
        -webkit-touch-callout: none !important;
        -webkit-user-select: none !important;
        user-select: none !important;
        touch-action: none !important;
        -webkit-tap-highlight-color: transparent !important;
        outline: none !important;
      }
      .vrm-press-btn { transition: transform 0.08s ease; }
      .vrm-press-btn:active { transform: scale(0.88); }
      @keyframes vrmFadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes vrmIdleFadeIn {
        from { opacity: 0; transform: scale(0.85); }
        to   { opacity: 1; transform: scale(1); }
      }
      @keyframes vrmHeartbeat {
        0%, 100% { transform: scale(1);   opacity: 1;    }
        18%      { transform: scale(1.4); opacity: 0.85; }
        36%      { transform: scale(1);   opacity: 1;    }
        54%      { transform: scale(1.4); opacity: 0.85; }
        72%      { transform: scale(1);   opacity: 1;    }
      }
      @keyframes vrmMicPulse {
        0%,100% { transform: scale(1);    box-shadow: 0 0 0 8px rgba(139,92,246,0.12); }
        50%     { transform: scale(1.07); box-shadow: 0 0 0 12px rgba(139,92,246,0.06); }
      }
      @keyframes vrmSlideHint {
        0%,100% { transform: translateX(0);    opacity: 0.7; }
        50%     { transform: translateX(-5px); opacity: 1;   }
      }
      .vrm-chevron-bob { animation: vrmChevronBob 1.6s ease-in-out infinite; }
      @keyframes vrmChevronBob {
        0%,100% { transform: translateY(0);    }
        50%     { transform: translateY(-3px); }
      }
      @keyframes vrmLockPop {
        0%   { opacity: 0; transform: scale(0.6) translateY(6px);   }
        40%  { opacity: 1; transform: scale(1.15) translateY(-4px); }
        70%  { transform: scale(0.95) translateY(0);                }
        100% { opacity: 0; transform: scale(1) translateY(-8px);    }
      }
      @keyframes vrmLockedIn {
        0%   { opacity: 0; transform: scale(0.85); }
        100% { opacity: 1; transform: scale(1);    }
      }
    `}</style>
  );
}