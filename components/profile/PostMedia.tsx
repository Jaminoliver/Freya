"use client";

import * as React from "react";
import { Lock } from "lucide-react";

interface MediaItem {
  type: string;
  url: string;
}

interface PostMediaProps {
  media: MediaItem[];
  isLocked: boolean;
  price?: number | null;
  onUnlock?: () => void;
}

export default function PostMedia({ media, isLocked, price, onUnlock }: PostMediaProps) {
  const [current, setCurrent] = React.useState(0);

  if (!media || media.length === 0) return null;

  // ── PPV / Locked ──────────────────────────────────────────────────────────
  if (isLocked) {
    return (
      <div style={{ position: "relative", width: "100%", backgroundColor: "#0A0A0F" }}>
        <img
          src={media[0].url}
          alt=""
          style={{ width: "100%", maxHeight: "520px", objectFit: "cover", display: "block", filter: "blur(20px)", transform: "scale(1.06)" }}
        />
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to bottom, rgba(10,10,15,0.3), rgba(10,10,15,0.7))",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px",
        }}>
          <div style={{
            width: "56px", height: "56px", borderRadius: "50%",
            backgroundColor: "rgba(139,92,246,0.2)", border: "2px solid #8B5CF6",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Lock size={22} color="#8B5CF6" />
          </div>
          <p style={{ margin: 0, fontSize: "14px", color: "#C4C4D4", fontFamily: "'Inter', sans-serif" }}>
            This content is locked
          </p>
          {price && (
            <button
              onClick={onUnlock}
              style={{
                padding: "10px 28px", borderRadius: "10px",
                background: "linear-gradient(135deg, #8B5CF6, #7C3AED)",
                border: "none", color: "#fff", fontSize: "14px", fontWeight: 700,
                cursor: "pointer", fontFamily: "'Inter', sans-serif",
              }}
            >
              Unlock for ₦{price.toLocaleString("en-NG")}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Single image ──────────────────────────────────────────────────────────
  if (media.length === 1) {
    if (media[0].type === "video") {
      return (
        <div style={{ width: "100%", backgroundColor: "#000" }}>
          <video
            src={media[0].url}
            controls
            autoPlay
            style={{ width: "100%", maxHeight: "560px", display: "block", objectFit: "contain" }}
          />
        </div>
      );
    }
    return (
      <div style={{ width: "100%" }}>
        <img
          src={media[0].url}
          alt=""
          style={{ width: "100%", maxHeight: "560px", objectFit: "cover", display: "block" }}
        />
      </div>
    );
  }

  // ── Carousel (multiple media) ─────────────────────────────────────────────
  return (
    <div style={{ position: "relative", width: "100%", backgroundColor: "#000" }}>
      {/* Current media item */}
      {media[current].type === "video" ? (
        <video
          src={media[current].url}
          controls
          autoPlay
          style={{ width: "100%", maxHeight: "560px", display: "block", objectFit: "contain" }}
        />
      ) : (
        <img
          src={media[current].url}
          alt=""
          style={{ width: "100%", maxHeight: "560px", objectFit: "cover", display: "block" }}
        />
      )}

      {/* Prev button */}
      {current > 0 && (
        <button
          onClick={() => setCurrent(current - 1)}
          style={{
            position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)",
            width: "36px", height: "36px", borderRadius: "50%",
            backgroundColor: "rgba(0,0,0,0.6)", border: "none",
            color: "#fff", fontSize: "18px", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >‹</button>
      )}

      {/* Next button */}
      {current < media.length - 1 && (
        <button
          onClick={() => setCurrent(current + 1)}
          style={{
            position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
            width: "36px", height: "36px", borderRadius: "50%",
            backgroundColor: "rgba(0,0,0,0.6)", border: "none",
            color: "#fff", fontSize: "18px", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >›</button>
      )}

      {/* Dot indicators */}
      <div style={{
        position: "absolute", bottom: "12px", left: "50%", transform: "translateX(-50%)",
        display: "flex", gap: "6px",
      }}>
        {media.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            style={{
              width: i === current ? "20px" : "6px", height: "6px",
              borderRadius: "3px", border: "none", cursor: "pointer",
              backgroundColor: i === current ? "#8B5CF6" : "rgba(255,255,255,0.5)",
              transition: "all 0.2s ease", padding: 0,
            }}
          />
        ))}
      </div>

      {/* Counter */}
      <div style={{
        position: "absolute", top: "12px", right: "12px",
        backgroundColor: "rgba(0,0,0,0.6)", borderRadius: "20px",
        padding: "3px 10px", fontSize: "12px", color: "#fff",
        fontFamily: "'Inter', sans-serif", fontWeight: 600,
      }}>
        {current + 1} / {media.length}
      </div>
    </div>
  );
}