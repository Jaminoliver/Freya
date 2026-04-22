"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

interface SuggestedCreator {
  id:               string;
  name:             string;
  username:         string;
  avatar_url:       string | null;
  banner_url:       string | null;
  isVerified:       boolean;
  subscriber_count: number;
  likes_count:      number;
  is_free:          boolean;
}
function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

let cachedCreators: SuggestedCreator[] | null = null;

export function FeedSuggestions() {
  const router    = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [creators, setCreators] = useState<SuggestedCreator[]>(cachedCreators ?? []);
  const [loading,  setLoading]  = useState(!cachedCreators);

  const fetchCreators = useCallback(async () => {
    if (cachedCreators) { setCreators(cachedCreators); setLoading(false); return; }
    setLoading(true);
    try {
      const res  = await fetch("/api/creators/suggested");
      const data = await res.json();
      console.log("[FeedSuggestions] data:", data.creators);
      if (res.ok && data.creators) {
        cachedCreators = data.creators;
        setCreators(data.creators);
      }
    } catch (err) {
      console.error("[FeedSuggestions] fetch error:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCreators(); }, [fetchCreators]);

  if (!loading && creators.length === 0) return null;

  return (
    <>
      <style>{`
        .feed-suggestions-track {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          overflow-y: hidden;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          padding: 0 16px 4px;
        }
        .feed-suggestions-track::-webkit-scrollbar {
          display: none;
        }
        .feed-creator-card {
          flex-shrink: 0;
          width: 200px;
          height: 270px;
          border-radius: 14px;
          overflow: hidden;
          cursor: pointer;
          position: relative;
          scroll-snap-align: start;
          border: 1px solid #2A2A3D;
          background-color: #1A1A2E;
          transition: border-color 0.15s ease, transform 0.15s ease;
        }
        .feed-creator-card:hover {
          border-color: #8B5CF6;
          transform: translateY(-2px);
        }
        @media (max-width: 480px) {
          .feed-creator-card {
            width: 170px;
            height: 240px;
          }
        }
        .skeleton-card {
          flex-shrink: 0;
          width: 200px;
          height: 270px;
          border-radius: 14px;
          background-color: #1A1A2E;
          animation: pulse 1.5s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.5; }
        }
        @media (max-width: 480px) {
          .skeleton-card {
            width: 170px;
            height: 240px;
          }
        }
      `}</style>

      <div style={{
        margin: "8px 0",
        backgroundColor: "#0A0A0F",
        borderTop: "1px solid #1F1F2A",
        borderBottom: "1px solid #1F1F2A",
        padding: "14px 0 16px",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 16px", marginBottom: "12px",
        }}>
          <span style={{
            fontSize: "13px", fontWeight: 700, color: "#E0E0F0",
            letterSpacing: "0.04em",
          }}>
            Suggested for you
          </span>
          <span style={{ fontSize: "11px", color: "#6B6B8A" }}>Scroll →</span>
        </div>

        {/* Scroll track */}
        <div className="feed-suggestions-track" ref={scrollRef}>
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton-card" />
              ))
            : creators.map((creator) => (
                <FeedCreatorCard
                  key={creator.id}
                  creator={creator}
                  onClick={() => router.push(`/${creator.username}`)}
                  is_free={creator.is_free}
                />
              ))
          }
        </div>
      </div>
    </>
  );
}

// ── Individual card ───────────────────────────────────────────────────────────
function FeedCreatorCard({
  creator,
  onClick,
  is_free,
}: {
  creator: SuggestedCreator;
  onClick: () => void;
  is_free?: boolean;
}) {
  const [bannerError, setBannerError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const initials = (creator.name[0] ?? "?").toUpperCase();

  return (
    <div className="feed-creator-card" onClick={onClick}>

      {/* Banner */}
      {creator.banner_url && !bannerError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={creator.banner_url}
          alt=""
          loading="lazy"
          onError={() => setBannerError(true)}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #1A1A2E 0%, #2A2A3D 100%)" }} />
      )}

      {/* Gradient overlay */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, rgba(0,0,0,0) 25%, rgba(0,0,0,0.92) 100%)",
      }} />

      {/* Free badge */}
      {is_free && (
        <span style={{
          position: "absolute", top: "10px", left: "10px",
          backgroundColor: "rgba(16,185,129,0.85)", backdropFilter: "blur(6px)",
          borderRadius: "20px", padding: "4px 12px", fontSize: "11px",
          fontWeight: 700, color: "#fff", zIndex: 2,
          fontFamily: "'Inter', sans-serif",
        }}>
          Free
        </span>
      )}

      {/* Avatar */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -38%)", zIndex: 2,
      }}>
        <div style={{
          width: "68px", height: "68px", borderRadius: "50%", padding: "2px",
          background: "conic-gradient(#C45F8C, #8B3FBF, #C45F8C)",
        }}>
          <div style={{
            width: "100%", height: "100%", borderRadius: "50%",
            overflow: "hidden", border: "2px solid #0A0A0F",
          }}>
            {creator.avatar_url && !avatarError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={creator.avatar_url}
                alt={creator.name}
                loading="lazy"
                onError={() => setAvatarError(true)}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            ) : (
              <div style={{
                width: "100%", height: "100%", background: "#8B5CF6",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: "24px", fontWeight: 700,
                fontFamily: "'Inter', sans-serif",
              }}>
                {initials}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Name + handle */}
      <div style={{
        position: "absolute", bottom: "36px", left: 0, right: 0, zIndex: 2,
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "0 10px", gap: "3px",
      }}>
        <span style={{
          fontSize: "15px", fontWeight: 700, color: "#fff",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          maxWidth: "160px", fontFamily: "'Inter', sans-serif",
        }}>
          {creator.name}
        </span>
        <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", fontFamily: "'Inter', sans-serif" }}>
          @{creator.username}
        </span>
      </div>

      {/* Stats */}
      <div style={{
        position: "absolute", bottom: "12px", left: 0, right: 0, zIndex: 2,
        display: "flex", justifyContent: "center", gap: "14px",
      }}>
        {/* Subscribers */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="rgba(250,192,50,0.15)" stroke="#F5C842" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 18h20" />
            <path d="M4 18L2 8l4.5 4L12 4l5.5 8L22 8l-2 10H4z" />
            <circle cx="12" cy="4" r="1.2" fill="#F5C842" stroke="none" />
            <circle cx="6.5" cy="12" r="1" fill="rgba(245,200,66,0.7)" stroke="none" />
            <circle cx="17.5" cy="12" r="1" fill="rgba(245,200,66,0.7)" stroke="none" />
          </svg>
          <span style={{ fontSize: "12px", color: "#F5C842", fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>
            {formatCount(creator.subscriber_count)}
          </span>
        </div>

        {/* Likes */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.9)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.85)", fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>
            {formatCount(creator.likes_count)}
          </span>
        </div>
      </div>
    </div>
  );
}