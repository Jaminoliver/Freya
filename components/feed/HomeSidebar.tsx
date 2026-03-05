"use client";

import { useState, useEffect, useCallback } from "react";
import { BadgeCheck, Heart, Users, RefreshCw, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { createClient } from "@/lib/supabase/client";

interface SuggestedCreator {
  id: string;
  name: string;
  username: string;
  avatar_url: string | null;
  banner_url: string | null;
  isVerified: boolean;
  subscriber_count: number;
  likes_count: number;
}

interface ProfileRow {
  id: string;
  display_name: string | null;
  username: string;
  avatar_url: string | null;
  banner_url: string | null;
  is_verified: boolean | null;
  subscriber_count: number | null;
  likes_count: number | null;
}

const PER_PAGE = 4;

export function HomeSidebar() {
  const router = useRouter();
  const [creators, setCreators] = useState<SuggestedCreator[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchCreators = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, username, avatar_url, banner_url, is_verified, subscriber_count, likes_count")
      .eq("role", "creator")
      .eq("is_active", true)
      .eq("is_suspended", false)
      .order("subscriber_count", { ascending: false })
      .limit(12);

    if (!error && data) {
      setCreators(
        (data as ProfileRow[]).map((p) => ({
          id: p.id,
          name: p.display_name || p.username,
          username: p.username,
          avatar_url: p.avatar_url,
          banner_url: p.banner_url,
          isVerified: p.is_verified ?? false,
          subscriber_count: p.subscriber_count ?? 0,
          likes_count: p.likes_count ?? 0,
        }))
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCreators(); }, [fetchCreators]);

  const totalPages = Math.ceil(creators.length / PER_PAGE);
  const visible = creators.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
      {/* Header row */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: "14px",
      }}>
        <span style={{ fontSize: "12px", fontWeight: 700, color: "#6B6B8A", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Suggestions
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            style={{ width: "26px", height: "26px", borderRadius: "6px", backgroundColor: "transparent", border: "1px solid #2A2A3D", color: "#6B6B8A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            title="Filter"
          >
            <Filter size={13} />
          </button>
          <button
            onClick={fetchCreators}
            style={{ width: "26px", height: "26px", borderRadius: "6px", backgroundColor: "transparent", border: "1px solid #2A2A3D", color: "#6B6B8A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            title="Refresh"
          >
            <RefreshCw size={13} />
          </button>
          <button
            onClick={() => setPage((prev) => Math.max(0, prev - 1))}
            disabled={page === 0}
            style={{ width: "26px", height: "26px", borderRadius: "6px", backgroundColor: "transparent", border: "1px solid #2A2A3D", color: page === 0 ? "#2A2A3D" : "#6B6B8A", cursor: page === 0 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <ChevronLeft size={13} />
          </button>
          <button
            onClick={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}
            disabled={page >= totalPages - 1}
            style={{ width: "26px", height: "26px", borderRadius: "6px", backgroundColor: "transparent", border: "1px solid #2A2A3D", color: page >= totalPages - 1 ? "#2A2A3D" : "#6B6B8A", cursor: page >= totalPages - 1 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* 2-column grid */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ height: "220px", borderRadius: "10px", backgroundColor: "#1A1A2E", animation: "pulse 1.5s ease-in-out infinite" }} />
          ))}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          {visible.map((creator) => (
            <CreatorCard
              key={creator.id}
              creator={creator}
              onClick={() => router.push(`/${creator.username}`)}
            />
          ))}
        </div>
      )}

      {/* Pagination dots */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginTop: "14px" }}>
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              style={{
                width: i === page ? "18px" : "6px",
                height: "6px",
                borderRadius: "3px",
                border: "none",
                cursor: "pointer",
                backgroundColor: i === page ? "#8B5CF6" : "#2A2A3D",
                padding: 0,
                transition: "all 0.2s ease",
              }}
            />
          ))}
        </div>
      )}

      {/* See all button */}
      <button
        onClick={() => router.push("/explore")}
        style={{
          marginTop: "14px", width: "100%", padding: "9px",
          borderRadius: "8px", border: "1px solid #2A2A3D",
          backgroundColor: "transparent", color: "#8B5CF6",
          fontSize: "12px", fontWeight: 600, cursor: "pointer",
          fontFamily: "'Inter', sans-serif", transition: "all 0.15s ease",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(139,92,246,0.08)"; e.currentTarget.style.borderColor = "#8B5CF6"; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.borderColor = "#2A2A3D"; }}
      >
        See all creators
      </button>
    </div>
  );
}

// ── Single creator card ───────────────────────────────────────────────────────
function formatCount(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

const FALLBACK_COVER = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80";

function CreatorCard({ creator, onClick }: { creator: SuggestedCreator; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: "10px", overflow: "hidden", cursor: "pointer",
        border: `1px solid ${hovered ? "#8B5CF6" : "#2A2A3D"}`,
        transition: "border-color 0.15s ease",
        position: "relative", height: "220px",
      }}
    >
      {/* Cover image */}
      <img
        src={creator.banner_url || FALLBACK_COVER}
        alt={creator.name}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />

      {/* Dark gradient overlay */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.0) 30%, rgba(0,0,0,0.85) 100%)",
      }} />

      {/* Avatar */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -20%)",
        zIndex: 2,
      }}>
        <Avatar src={creator.avatar_url ?? undefined} alt={creator.name} size="lg" showRing />
      </div>

      {/* Name + username */}
      <div style={{
        position: "absolute", bottom: "28px", left: 0, right: 0,
        display: "flex", flexDirection: "column", alignItems: "center", gap: "2px",
        zIndex: 2, padding: "0 6px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.6)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "90px" }}>
            {creator.name}
          </span>
          {creator.isVerified && <BadgeCheck size={11} color="#A78BFA" />}
        </div>
        <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.65)" }}>@{creator.username}</span>
      </div>

      {/* Stats row */}
      <div style={{
        position: "absolute", bottom: "8px", left: 0, right: 0,
        display: "flex", justifyContent: "center", gap: "10px",
        zIndex: 2,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
          <Users size={9} color="rgba(255,255,255,0.6)" />
          <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>
            {formatCount(creator.subscriber_count)}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
          <Heart size={9} color="rgba(255,255,255,0.6)" />
          <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>
            {formatCount(creator.likes_count)}
          </span>
        </div>
      </div>
    </div>
  );
}