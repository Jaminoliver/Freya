"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { MessagesSquare } from "lucide-react";
import { useNav } from "@/lib/hooks/useNav";
import { startConversation } from "@/app/(main)/messages/page";

interface Tipper {
  id:            string;
  username:      string;
  display_name:  string;
  avatar_url:    string | null;
  amount:        number;
  tipped_at:     string;
  is_subscribed: boolean;
}

interface Props {
  postId: number;
  open:   boolean;
  onClose: () => void;
}

const STYLES = `
@keyframes td-shimmer {
  0%   { background-position: -600px 0; }
  100% { background-position:  600px 0; }
}
@keyframes td-sheet-in {
  from { transform: translateX(-50%) translateY(100%); }
  to   { transform: translateX(-50%) translateY(0); }
}
@keyframes td-row-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;

const shimmerStyle: React.CSSProperties = {
  backgroundImage: "linear-gradient(90deg, #0F0F1A 0px, #1A1A2E 80px, #0F0F1A 160px)",
  backgroundSize:  "600px 100%",
  animation:       "td-shimmer 1.6s infinite linear",
  borderRadius:    "6px",
};

function relative(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function compactNaira(kobo: number) {
  const n = kobo / 100;
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 10_000)    return `₦${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return `₦${n.toLocaleString("en-NG")}`;
}

const GiftIcon = ({ color = "currentColor" }: { color?: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 12 20 22 4 22 4 12"/>
    <rect x="2" y="7" width="20" height="5"/>
    <line x1="12" y1="22" x2="12" y2="7"/>
    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
  </svg>
);

export default function TipDetailsSheet({ postId, open, onClose }: Props) {
  const [tippers,   setTippers]   = useState<Tipper[]>([]);
  const [totalKobo, setTotalKobo] = useState(0);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [msgLoading, setMsgLoading] = useState<Record<string, boolean>>({});

  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef  = useRef({ active: false, startY: 0 });

  const { navigate } = useNav();

  const handleMessage = async (tipperId: string) => {
    if (msgLoading[tipperId]) return;
    setMsgLoading((prev) => ({ ...prev, [tipperId]: true }));
    const conversationId = await startConversation(tipperId);
    if (conversationId) navigate(`/messages/${conversationId}`);
    else setMsgLoading((prev) => ({ ...prev, [tipperId]: false }));
  };

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    let cancelled = false;
    fetch(`/api/posts/${postId}/tips`, { cache: "no-store" })
      .then((res) => res.json().then((data) => ({ res, data })))
      .then(({ res, data }) => {
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error ?? "Failed to load tips");
        setTippers(data.tippers);
        setTotalKobo(data.total_kobo);
      })
      .catch((e: any) => { if (!cancelled) setError(e.message ?? "Error loading tips"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [postId]);

  useEffect(() => {
    if (!open) return;
    return load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const y = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top      = `-${y}px`;
    document.body.style.width    = "100%";
    return () => {
      document.body.style.position = "";
      document.body.style.top      = "";
      document.body.style.width    = "";
      window.scrollTo(0, y);
    };
  }, [open]);

  

  if (!open) return null;

  const mainEl = typeof document !== "undefined" ? document.querySelector("main") : null;
  const mainRect = mainEl?.getBoundingClientRect();
  const overlayLeft  = mainRect?.left  ?? 0;
  const overlayWidth = mainRect?.width ?? "100%";

  return createPortal(
    <>
      <style>{STYLES}</style>
      <div style={{ position: "fixed", top: 0, left: overlayLeft, width: overlayWidth, height: "100%", zIndex: 300 }}>

        <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} />

        <div
          ref={panelRef}
          onTouchStart={(e) => { dragRef.current = { active: true, startY: e.touches[0].clientY }; e.stopPropagation(); }}
          onTouchMove={(e) => {
            if (!dragRef.current.active) return;
            const dy = e.touches[0].clientY - dragRef.current.startY;
            if (dy > 0 && panelRef.current) {
              panelRef.current.style.transform  = `translateY(${dy}px)`;
              panelRef.current.style.transition = "none";
            }
            e.stopPropagation();
          }}
          onTouchEnd={(e) => {
            if (!dragRef.current.active) return;
            dragRef.current.active = false;
            const dy = e.changedTouches[0].clientY - dragRef.current.startY;
            if (dy > 80) {
              onClose();
            } else if (panelRef.current) {
              panelRef.current.style.transition = "transform 0.25s cubic-bezier(0.32,0.72,0,1)";
              panelRef.current.style.transform  = "translateX(-50%) translateY(0)";
            }
            e.stopPropagation();
          }}
          style={{
            position:        "absolute",
            bottom:          0,
            left:            "50%",
            width:           "100%",
            maxWidth:        "560px",
            background:      "#0D0D18",
            borderRadius:    "20px 20px 0 0",
            maxHeight:       "70vh",
            display:         "flex",
            flexDirection:   "column",
            animation:       "td-sheet-in 0.32s cubic-bezier(0.32,0.72,0,1) forwards",
            willChange:      "transform",
          }}
        >
          {/* Drag handle */}
          <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 8px" }}>
            <div style={{ width: 40, height: 4, borderRadius: 4, background: "#2A2A3D" }} />
          </div>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 20px 12px", borderBottom: "1px solid #1E1E2E" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <GiftIcon color="#8B5CF6" />
              <span style={{ color: "#F1F5F9", fontSize: 15, fontWeight: 600, fontFamily: "Inter,sans-serif" }}>
                {compactNaira(totalKobo)} earned
              </span>
            </div>
            {!loading && (
              <span style={{ color: "#6B6B8A", fontSize: 12, fontFamily: "Inter,sans-serif" }}>
                {tippers.length} {tippers.length === 1 ? "tip" : "tips"}
              </span>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: "auto", flex: 1, padding: "6px 0 calc(env(safe-area-inset-bottom) + 8px)" }}>

            {/* Skeleton */}
            {loading && [0, 1, 2].map((i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px" }}>
                <div style={{ ...shimmerStyle, width: 38, height: 38, borderRadius: "50%", flexShrink: 0 }} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ ...shimmerStyle, width: "38%", height: 12 }} />
                  <div style={{ ...shimmerStyle, width: "22%", height: 10 }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                  <div style={{ ...shimmerStyle, width: 58, height: 13 }} />
                  <div style={{ ...shimmerStyle, width: 38, height: 10 }} />
                </div>
              </div>
            ))}

            {/* Error */}
            {error && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 20px", gap: 8 }}>
                <span style={{ fontSize: 13, color: "#F87171", fontFamily: "Inter,sans-serif" }}>{error}</span>
                <button
                  onClick={load}
                  style={{ fontSize: 13, color: "#8B5CF6", fontFamily: "Inter,sans-serif", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                >
                  Retry
                </button>
              </div>
            )}

            {/* Empty */}
            {!loading && !error && tippers.length === 0 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 20px", gap: 10 }}>
                <GiftIcon color="#4A4A6A" />
                <span style={{ fontSize: 14, color: "#6B6B8A", fontFamily: "Inter,sans-serif" }}>No tips yet</span>
              </div>
            )}

            {/* Rows */}
            {!loading && !error && tippers.map((t, i) => (
              <div
                key={`${t.id}-${t.tipped_at}`}
                style={{
                  display:       "flex",
                  alignItems:    "center",
                  gap:           12,
                  padding:       "12px 20px",
                  borderBottom:  i < tippers.length - 1 ? "1px solid #1A1A2E" : "none",
                  animation:     "td-row-in 0.22s ease forwards",
                  animationDelay:`${i * 40}ms`,
                  opacity:       0,
                }}
              >
                {/* Avatar */}
                {t.avatar_url ? (
                  <img
                    src={t.avatar_url} alt={t.display_name}
                    style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                  />
                ) : (
                  <div style={{
                    width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                    background: "linear-gradient(135deg, #8B5CF6, #EC4899)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: "Inter,sans-serif" }}>
                      {(t.display_name || t.username).charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 600, color: "#F1F5F9", fontFamily: "Inter,sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {t.display_name || t.username}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 11, color: "#8B5CF6", fontFamily: "Inter,sans-serif" }}>@{t.username}</span>
                    {t.is_subscribed && (
                      <span style={{ fontSize: 10, fontWeight: 600, color: "#10B981", backgroundColor: "rgba(16,185,129,0.12)", borderRadius: 4, padding: "1px 5px", fontFamily: "Inter,sans-serif" }}>
                        subscribed
                      </span>
                    )}
                  </div>
                </div>

                {/* Amount + time */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#10B981", fontFamily: "Inter,sans-serif" }}>
                    {compactNaira(t.amount)}
                  </span>
                  <span style={{ fontSize: 10, color: "#6B6B8A", fontFamily: "Inter,sans-serif" }}>
                    {relative(t.tipped_at)}
                  </span>
                </div>

                {/* Message */}
                <button
                  onClick={() => handleMessage(t.id)}
                  disabled={!!msgLoading[t.id]}
                  style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid #2A2A3D", backgroundColor: "transparent", color: "#C4C4D4", cursor: msgLoading[t.id] ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: msgLoading[t.id] ? 0.6 : 1 }}
                >
                  {msgLoading[t.id]
                    ? <div style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid currentColor", borderTopColor: "transparent", animation: "td-shimmer 0.6s linear infinite" }} />
                    : <MessagesSquare size={16} strokeWidth={1.8} />}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}