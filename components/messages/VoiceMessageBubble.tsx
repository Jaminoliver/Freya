// components/messages/VoiceMessageBubble.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause, MoreVertical } from "lucide-react";
import { ReadTick } from "@/components/messages/ReadTick";
import { MessageActionModal } from "@/components/messages/MessageActionModal";
import { ReactionPills } from "@/components/messages/ReactionPills";
import type { Message, Conversation } from "@/lib/types/messages";

interface Props {
  message:      Message;
  conversation: Conversation;
  isOwn:        boolean;
  isSameGroup?: boolean;
  isRead:       boolean;
  isDelivered?: boolean;
  time:         string;
  onReply?:     (message: Message) => void;
  onDelete?:    (message: Message, deleteFor: "me" | "everyone") => void;
  onSelect?:    (messageId: number) => void;
  onReact?:     (message: Message, emoji: string) => void;
}

const SPEEDS = [1, 1.5, 2] as const;
const PEAK_BARS = 50;

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) s = 0;
  const m   = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function VoiceMessageBubble({
  message, conversation, isOwn, isSameGroup, isRead, isDelivered, time,
  onReply, onDelete, onSelect, onReact,
}: Props) {
  const { participant } = conversation;

  const [playing,  setPlaying]  = useState(false);
  const [progress, setProgress] = useState(0);          // 0–1
  const [current,  setCurrent]  = useState(0);          // seconds
  const [speed,    setSpeed]    = useState<typeof SPEEDS[number]>(1);
  const [sheetOpen, setSheetOpen] = useState(false);

  const audioRef         = useRef<HTMLAudioElement | null>(null);
  const waveformRef      = useRef<HTMLDivElement | null>(null);
  const bubbleRef        = useRef<HTMLDivElement | null>(null);
  const capturedRectRef  = useRef<DOMRect | null>(null);
  const longPressTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didMoveRef       = useRef(false);

  const totalDuration = message.audioDuration ?? 0;
  const peaks         = message.audioPeaks ?? new Array(PEAK_BARS).fill(0.3);

  // ── Audio element setup ───────────────────────────────────────────────────
  useEffect(() => {
    if (!message.audioUrl) return;
    const audio = new Audio(message.audioUrl);
    audio.preload = "metadata";
    audioRef.current = audio;

    const onTime = () => {
      const dur = audio.duration && isFinite(audio.duration) ? audio.duration : totalDuration;
      setCurrent(audio.currentTime);
      setProgress(dur > 0 ? audio.currentTime / dur : 0);
    };
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
      setCurrent(0);
      audio.currentTime = 0;
    };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnd);
      audioRef.current = null;
    };
  }, [message.audioUrl, totalDuration]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  };

  // ── Seek by tap/click on waveform ─────────────────────────────────────────
  const handleSeek = (clientX: number) => {
    const wf  = waveformRef.current;
    const aud = audioRef.current;
    if (!wf || !aud || !totalDuration) return;
    const rect = wf.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    aud.currentTime = ratio * totalDuration;
    setProgress(ratio);
    setCurrent(ratio * totalDuration);
  };

  // ── Long-press / right-click → action sheet ──────────────────────────────
  const startPress = (e: React.TouchEvent | React.MouseEvent) => {
    didMoveRef.current = false;
    longPressTimer.current = setTimeout(() => {
      if (!didMoveRef.current) {
        capturedRectRef.current = bubbleRef.current?.getBoundingClientRect() ?? null;
        setSheetOpen(true);
      }
    }, 500);
  };
  const movePress   = () => { didMoveRef.current = true; cancelPress(); };
  const cancelPress = () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); };

  return (
    <>
      <style>{`
        @media (max-width: 767px) { .voice-dot-btn { display: none !important; } }
      `}</style>

      {sheetOpen && (
        <MessageActionModal
          message={message}
          isOwn={isOwn}
          bubbleRect={capturedRectRef.current}
          onCopy={() => {}}
          onReply={() => { onReply?.(message); setSheetOpen(false); }}
          onDeleteForMe={() => { onDelete?.(message, "me"); setSheetOpen(false); }}
          onDeleteForEveryone={() => { onDelete?.(message, "everyone"); setSheetOpen(false); }}
          onSelect={onSelect}
          onReact={(emoji) => onReact?.(message, emoji)}
          onClose={() => setSheetOpen(false)}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", alignSelf: isOwn ? "flex-end" : "flex-start", maxWidth: "80%", gap: "2px" }}>
        <div style={{ display: "flex", flexDirection: isOwn ? "row-reverse" : "row", alignItems: "flex-end", gap: "6px" }}>
          {/* Dot menu — desktop only */}
          <button
            className="voice-dot-btn"
            onClick={() => { capturedRectRef.current = bubbleRef.current?.getBoundingClientRect() ?? null; setSheetOpen(true); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#4A4A6A", padding: "4px", borderRadius: "6px", display: "flex", alignItems: "center", transition: "color 0.15s", flexShrink: 0 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#4A4A6A")}
          >
            <MoreVertical size={15} strokeWidth={1.8} />
          </button>

          {/* Avatar (received only, first in group) */}
          {!isOwn && !isSameGroup && (
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", overflow: "hidden", flexShrink: 0, backgroundColor: "#2A2A3D" }}>
              {participant.avatarUrl
                ? <img src={participant.avatarUrl} alt={participant.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <div style={{ width: "100%", height: "100%", backgroundColor: "#8B5CF6", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFFFFF", fontSize: "14px", fontWeight: 700 }}>{participant.name[0].toUpperCase()}</div>
              }
            </div>
          )}
          {!isOwn && isSameGroup && <div style={{ width: "36px", flexShrink: 0 }} />}

          {/* Bubble */}
          <div
            ref={bubbleRef}
            onTouchStart={startPress}
            onTouchMove={movePress}
            onTouchEnd={cancelPress}
            onTouchCancel={cancelPress}
            onContextMenu={(e) => { e.preventDefault(); capturedRectRef.current = bubbleRef.current?.getBoundingClientRect() ?? null; setSheetOpen(true); }}
            style={{
              backgroundColor: isOwn ? "#8B5CF6" : "#1E1E2E",
              borderRadius:    isOwn ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              padding:         "8px 12px 6px",
              display:         "flex",
              flexDirection:   "column",
              gap:             "4px",
              width:           "260px",
              maxWidth:        "100%",
              fontFamily:      "'Inter', sans-serif",
              userSelect:      "none",
              WebkitUserSelect: "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {/* Play / Pause */}
              <button
                onClick={togglePlay}
                style={{
                  width:           "36px",
                  height:          "36px",
                  borderRadius:    "50%",
                  border:          "none",
                  cursor:          "pointer",
                  display:         "flex",
                  alignItems:      "center",
                  justifyContent:  "center",
                  backgroundColor: isOwn ? "rgba(255,255,255,0.22)" : "rgba(139,92,246,0.22)",
                  color:           "#FFFFFF",
                  flexShrink:      0,
                }}
              >
                {playing
                  ? <Pause size={16} strokeWidth={2} fill="#FFFFFF" />
                  : <Play  size={16} strokeWidth={2} fill="#FFFFFF" style={{ marginLeft: "2px" }} />
                }
              </button>

              {/* Waveform */}
              <div
                ref={waveformRef}
                onClick={(e) => handleSeek(e.clientX)}
                onTouchEnd={(e) => {
                  const t = e.changedTouches[0];
                  if (t) handleSeek(t.clientX);
                }}
                style={{
                  flex:        1,
                  height:      "32px",
                  display:     "flex",
                  alignItems:  "center",
                  gap:         "2px",
                  cursor:      "pointer",
                  minWidth:    0,
                }}
              >
                {peaks.slice(0, PEAK_BARS).map((p, i) => {
                  const filled = i / PEAK_BARS <= progress;
                  const h      = Math.max(0.18, Math.min(1, p));
                  return (
                    <div
                      key={i}
                      style={{
                        flex:            1,
                        height:          `${h * 100}%`,
                        borderRadius:    "1px",
                        backgroundColor: filled
                          ? (isOwn ? "#FFFFFF" : "#8B5CF6")
                          : (isOwn ? "rgba(255,255,255,0.4)" : "rgba(139,92,246,0.35)"),
                        transition:      "background-color 0.1s ease",
                      }}
                    />
                  );
                })}
              </div>

              {/* Speed toggle */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const idx = SPEEDS.indexOf(speed);
                  const next = SPEEDS[(idx + 1) % SPEEDS.length];
                  setSpeed(next);
                }}
                style={{
                  flexShrink:      0,
                  padding:         "2px 8px",
                  borderRadius:    "999px",
                  border:          "none",
                  cursor:          "pointer",
                  fontSize:        "11px",
                  fontWeight:      700,
                  color:           "#FFFFFF",
                  backgroundColor: isOwn ? "rgba(255,255,255,0.2)" : "rgba(139,92,246,0.2)",
                  fontFamily:      "'Inter', sans-serif",
                }}
              >
                {speed}x
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px", marginTop: "2px" }}>
              <span style={{ fontSize: "11px", color: isOwn ? "rgba(255,255,255,0.65)" : "#A3A3C2", fontVariantNumeric: "tabular-nums" }}>
                {playing || progress > 0 ? formatTime(current) : formatTime(totalDuration)}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                <span style={{ fontSize: "10px", color: isOwn ? "rgba(255,255,255,0.55)" : "#4A4A6A", lineHeight: 1 }}>{time}</span>
                {isOwn && <ReadTick status={message.status} isDelivered={isDelivered} isRead={isRead} />}
              </div>
            </div>
          </div>
        </div>

        <ReactionPills reactions={message.reactions ?? []} isOwn={isOwn} onToggle={(emoji) => onReact?.(message, emoji)} />
      </div>
    </>
  );
}