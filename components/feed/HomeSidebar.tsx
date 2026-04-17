// components/layout/HomeSidebar.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { BadgeCheck, UserPlus, RefreshCw, Filter, ChevronLeft, ChevronRight } from "lucide-react";
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
  follower_count:   number;
  likes_count:      number;
  is_online?:       boolean;
}

interface ProfileRow {
  id:               string;
  display_name:     string | null;
  username:         string;
  avatar_url:       string | null;
  banner_url:       string | null;
  is_verified:      boolean | null;
  subscriber_count: number | null;
  follower_count:   number | null;
  likes_count:      number | null;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

const PER_PAGE = 3;
const FALLBACK_BANNER = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80";
const FALLBACK_AVATAR = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80";

export function HomeSidebar() {
  const router  = useRouter();
  const [creators, setCreators] = useState<SuggestedCreator[]>([]);
  const [page,     setPage]     = useState(0);
  const [loading,  setLoading]  = useState(true);

  const fetchCreators = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, username, avatar_url, banner_url, is_verified, subscriber_count, follower_count, likes_count")
      .eq("role", "creator")
      .eq("is_active", true)
      .eq("is_suspended", false)
      .order("subscriber_count", { ascending: false })
      .limit(12);

    if (!error && data) {
      setCreators(
        (data as ProfileRow[]).map((p) => ({
          id:               p.id,
          name:             p.display_name || p.username,
          username:         p.username,
          avatar_url:       p.avatar_url,
          banner_url:       p.banner_url,
          isVerified:       p.is_verified ?? false,
          subscriber_count: p.subscriber_count ?? 0,
          follower_count:   p.follower_count ?? 0,
          likes_count:      p.likes_count ?? 0,
          is_online:        Math.random() > 0.5,
        }))
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCreators(); }, [fetchCreators]);

  const totalPages = Math.ceil(creators.length / PER_PAGE);
  const visible    = creators.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
        <span style={{ fontSize: "10px", fontWeight: 700, color: "#6B6B8A", letterSpacing: "0.12em", textTransform: "uppercase" }}>
          Suggestions
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          {[
            { icon: <Filter size={11} />, title: "Filter", onClick: undefined },
            { icon: <RefreshCw size={11} />, title: "Refresh", onClick: fetchCreators },
            { icon: <ChevronLeft size={11} />, title: "Prev", onClick: () => setPage((p) => Math.max(0, p - 1)), disabled: page === 0 },
            { icon: <ChevronRight size={11} />, title: "Next", onClick: () => setPage((p) => Math.min(totalPages - 1, p + 1)), disabled: page >= totalPages - 1 },
          ].map((btn, i) => (
            <button
              key={i}
              onClick={btn.onClick}
              disabled={btn.disabled}
              title={btn.title}
              style={{
                width: "26px", height: "26px", borderRadius: "7px",
                backgroundColor: "transparent",
                border: "1px solid #2A2A3D",
                color: btn.disabled ? "#2A2A3D" : "#6B6B8A",
                cursor: btn.disabled ? "default" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s",
              }}
            >
              {btn.icon}
            </button>
          ))}
        </div>
      </div>

      {/* ── List ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ height: "110px", borderRadius: "14px", backgroundColor: "#1A1A2E", animation: "pulse 1.5s ease-in-out infinite" }} />
            ))
          : visible.map((creator) => (
              <ListCard
                key={creator.id}
                creator={creator}
                onClick={() => router.push(`/${creator.username}`)}
              />
            ))
        }
      </div>

      {/* ── Pagination dots ── */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginTop: "14px" }}>
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              style={{
                width: i === page ? "18px" : "5px",
                height: "5px", borderRadius: "3px",
                border: "none", cursor: "pointer", padding: 0,
                backgroundColor: i === page ? "#C45F8C" : "#2A2A3D",
                transition: "all 0.2s ease",
              }}
            />
          ))}
        </div>
      )}

      {/* ── See all ── */}
      <button
        onClick={() => router.push("/explore")}
        style={{
          marginTop: "14px", width: "100%", padding: "9px",
          borderRadius: "9px", border: "1px solid #2A2A3D",
          backgroundColor: "transparent", color: "#C45F8C",
          fontSize: "12px", fontWeight: 600, cursor: "pointer",
          fontFamily: "'Inter', sans-serif", transition: "all 0.15s ease",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(196,95,140,0.08)"; e.currentTarget.style.borderColor = "#C45F8C"; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.borderColor = "#2A2A3D"; }}
      >
        See all creators
      </button>
    </div>
  );
}

// ── List row card ─────────────────────────────────────────────────────────────
function ListCard({ creator, onClick }: { creator: SuggestedCreator; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative", height: "110px", borderRadius: "14px",
        overflow: "hidden", cursor: "pointer",
        border: `1px solid ${hovered ? "#C45F8C" : "#2A2A3D"}`,
        transition: "border-color 0.15s ease",
      }}
    >
      {/* Cover */}
      <img
        src={creator.banner_url || FALLBACK_BANNER}
        alt=""
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
      />

      {/* Overlay */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(90deg, rgba(10,8,15,0.85) 0%, rgba(10,8,15,0.5) 55%, rgba(10,8,15,0.65) 100%)",
      }} />

      {/* Content */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center",
        padding: "0 14px 0 12px", gap: "13px",
      }}>

        {/* Avatar ring */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          {/* Free tag */}
          <div style={{
            position: "absolute", top: "-5px", left: "-2px", zIndex: 3,
            background: "#3abf7a", color: "#fff",
            fontSize: "8px", fontWeight: 700, letterSpacing: "0.4px",
            padding: "2px 6px", borderRadius: "4px",
          }}>
            Free
          </div>

          {/* Ring */}
          <div style={{
            width: "64px", height: "64px", borderRadius: "50%", padding: "2.5px",
            background: "conic-gradient(#C45F8C, #8B3FBF, #C45F8C)",
            flexShrink: 0,
          }}>
            <div style={{
              width: "100%", height: "100%", borderRadius: "50%",
              overflow: "hidden", border: "2.5px solid #0A0A0F",
            }}>
              <img
                src={creator.avatar_url || FALLBACK_AVATAR}
                alt={creator.name}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </div>
          </div>

          {/* Online dot */}
          {creator.is_online && (
            <div style={{
              position: "absolute", bottom: "3px", right: "3px",
              width: "12px", height: "12px", borderRadius: "50%",
              background: "#3abf7a", border: "2.5px solid #0A0A0F",
            }} />
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{
              fontSize: "14px", fontWeight: 600, color: "#F2EDF8",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              maxWidth: "140px",
            }}>
              {creator.name}
            </span>
            {creator.isVerified && <BadgeCheck size={13} color="#C45F8C" />}
          </div>
          <div style={{ fontSize: "11px", color: "#9A8FA8", marginTop: "2px" }}>
            @{creator.username}
          </div>

          {/* Stats — matches CreatorCard style */}
          <div style={{ display: "flex", gap: "10px", marginTop: "7px" }}>

            {/* Subscribers — crown (gold) */}
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

            {/* Followers — user plus (soft blue) */}
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <UserPlus size={14} color="#60A5FA" strokeWidth={1.8} />
              <span style={{ fontSize: "12px", color: "#60A5FA", fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>
                {formatCount(creator.follower_count)}
              </span>
            </div>

            {/* Likes — heart outline (white) */}
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

        {/* Three dots */}
        <div style={{ display: "flex", flexDirection: "column", gap: "3.5px", alignItems: "center", flexShrink: 0 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ width: "3.5px", height: "3.5px", borderRadius: "50%", background: "rgba(255,255,255,0.45)" }} />
          ))}
        </div>
      </div>
    </div>
  );
}