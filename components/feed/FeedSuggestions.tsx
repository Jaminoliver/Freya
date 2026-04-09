"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { BadgeCheck, Heart, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface SuggestedCreator {
  id:               string;
  name:             string;
  username:         string;
  avatar_url:       string | null;
  banner_url:       string | null;
  isVerified:       boolean;
  subscriber_count: number;
  likes_count:      number;
}

interface ProfileRow {
  id:               string;
  display_name:     string | null;
  username:         string;
  avatar_url:       string | null;
  banner_url:       string | null;
  is_verified:      boolean | null;
  subscriber_count: number | null;
  likes_count:      number | null;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

const FALLBACK_BANNER = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80";
const FALLBACK_AVATAR = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80";

let cachedCreators: SuggestedCreator[] | null = null;

export function FeedSuggestions() {
  const router     = useRouter();
  const scrollRef  = useRef<HTMLDivElement>(null);
  const [creators, setCreators] = useState<SuggestedCreator[]>(cachedCreators ?? []);
  const [loading,  setLoading]  = useState(!cachedCreators);

  const fetchCreators = useCallback(async () => {
    if (cachedCreators) { setCreators(cachedCreators); setLoading(false); return; }
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, username, avatar_url, banner_url, is_verified, subscriber_count, likes_count")
      .eq("role", "creator")
      .eq("is_active", true)
      .eq("is_suspended", false)
      .order("likes_count", { ascending: false })
      .limit(10);

    if (!error && data) {
      const mapped = (data as ProfileRow[]).map((p) => ({
        id:               p.id,
        name:             p.display_name || p.username,
        username:         p.username,
        avatar_url:       p.avatar_url,
        banner_url:       p.banner_url,
        isVerified:       p.is_verified ?? false,
        subscriber_count: p.subscriber_count ?? 0,
        likes_count:      p.likes_count ?? 0,
      }));
      cachedCreators = mapped;
      setCreators(mapped);
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
          width: 160px;
          height: 220px;
          border-radius: 14px;
          overflow: hidden;
          cursor: pointer;
          position: relative;
          scroll-snap-align: start;
          border: 1px solid #2A2A3D;
          transition: border-color 0.15s ease, transform 0.15s ease;
        }
        .feed-creator-card:hover {
          border-color: #C45F8C;
          transform: translateY(-2px);
        }
        @media (max-width: 480px) {
          .feed-creator-card {
            width: 140px;
            height: 200px;
          }
        }
        .skeleton-card {
          flex-shrink: 0;
          width: 160px;
          height: 220px;
          border-radius: 14px;
          background-color: #1A1A2E;
          animation: pulse 1.5s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @media (max-width: 480px) {
          .skeleton-card {
            width: 140px;
            height: 200px;
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
            fontSize: "10px", fontWeight: 700, color: "#6B6B8A",
            letterSpacing: "0.12em", textTransform: "uppercase",
          }}>
            Suggested for you
          </span>
          <span style={{ fontSize: "10px", color: "#6B6B8A" }}>Scroll →</span>
        </div>

        {/* Scroll track — native scroll, no JS offset */}
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
}: {
  creator: SuggestedCreator;
  onClick: () => void;
}) {
  return (
    <div className="feed-creator-card" onClick={onClick}>
      {/* Cover */}
      <img
        src={creator.banner_url || FALLBACK_BANNER}
        alt=""
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
      />

      {/* Gradient */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, rgba(0,0,0,0) 25%, rgba(0,0,0,0.92) 100%)",
      }} />

      {/* Free tag */}
      <div style={{
        position: "absolute", top: "8px", left: "8px",
        background: "#3abf7a", color: "#fff",
        fontSize: "8px", fontWeight: 700, letterSpacing: "0.4px",
        padding: "2px 6px", borderRadius: "4px", zIndex: 2,
      }}>
        Free
      </div>

      {/* Avatar */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -38%)", zIndex: 2,
      }}>
        <div style={{
          width: "56px", height: "56px", borderRadius: "50%", padding: "2px",
          background: "conic-gradient(#C45F8C, #8B3FBF, #C45F8C)",
        }}>
          <div style={{
            width: "100%", height: "100%", borderRadius: "50%",
            overflow: "hidden", border: "2px solid #0A0A0F",
          }}>
            <img
              src={creator.avatar_url || FALLBACK_AVATAR}
              alt={creator.name}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </div>
        </div>
      </div>

      {/* Name + handle */}
      <div style={{
        position: "absolute", bottom: "28px", left: 0, right: 0, zIndex: 2,
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "0 8px", gap: "2px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
          <span style={{
            fontSize: "12px", fontWeight: 700, color: "#fff",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            maxWidth: "110px",
          }}>
            {creator.name}
          </span>
          {creator.isVerified && <BadgeCheck size={11} color="#C45F8C" />}
        </div>
        <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.5)" }}>
          @{creator.username}
        </span>
      </div>

      {/* Stats */}
      <div style={{
        position: "absolute", bottom: "10px", left: 0, right: 0, zIndex: 2,
        display: "flex", justifyContent: "center", gap: "10px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
          <Users size={9} color="rgba(255,255,255,0.5)" />
          <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>
            {formatCount(creator.subscriber_count)}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
          <Heart size={9} color="#C45F8C" />
          <span style={{ fontSize: "9px", color: "#C45F8C", fontWeight: 600 }}>
            {formatCount(creator.likes_count)}
          </span>
        </div>
      </div>
    </div>
  );
}