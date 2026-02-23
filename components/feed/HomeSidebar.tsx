"use client";

import { useState } from "react";
import { BadgeCheck, Users, Image, RefreshCw, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";

interface SuggestedCreator {
  id: string;
  name: string;
  username: string;
  avatar_url: string;
  coverImage: string;
  isVerified: boolean;
  subscribers: string;
  posts: number;
}

const SUGGESTED_CREATORS: SuggestedCreator[] = [
  {
    id: "1", name: "Snow",         username: "Snow",
    avatar_url: "https://i.pravatar.cc/150?img=47",
    coverImage:  "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&q=80",
    isVerified: true,  subscribers: "8.23k", posts: 119,
  },
  {
    id: "2", name: "Crazysocket",  username: "Crazysocket",
    avatar_url: "https://i.pravatar.cc/150?img=45",
    coverImage:  "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=400&q=80",
    isVerified: true,  subscribers: "7.94k", posts: 14,
  },
  {
    id: "3", name: "Freakiest",    username: "Freakiest",
    avatar_url: "https://i.pravatar.cc/150?img=44",
    coverImage:  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80",
    isVerified: true,  subscribers: "5.12k", posts: 92,
  },
  {
    id: "4", name: "PrideVine",    username: "PrideVine",
    avatar_url: "https://i.pravatar.cc/150?img=43",
    coverImage:  "https://images.unsplash.com/photo-1513836279014-a89f7d76ae86?w=400&q=80",
    isVerified: true,  subscribers: "12.5k", posts: 203,
  },
  {
    id: "5", name: "LunaBella",    username: "LunaBella",
    avatar_url: "https://i.pravatar.cc/150?img=48",
    coverImage:  "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&q=80",
    isVerified: false, subscribers: "3.8k",  posts: 47,
  },
  {
    id: "6", name: "Aria Nova",    username: "AriaNova",
    avatar_url: "https://i.pravatar.cc/150?img=46",
    coverImage:  "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400&q=80",
    isVerified: true,  subscribers: "9.1k",  posts: 88,
  },
];

export function HomeSidebar() {
  const router  = useRouter();
  const [page, setPage] = useState(0);

  // Show 4 per page (2x2 grid)
  const perPage    = 4;
  const totalPages = Math.ceil(SUGGESTED_CREATORS.length / perPage);
  const visible    = SUGGESTED_CREATORS.slice(page * perPage, page * perPage + perPage);

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
            style={{ width: "26px", height: "26px", borderRadius: "6px", backgroundColor: "transparent", border: "1px solid #2A2A3D", color: "#6B6B8A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            title="Refresh"
          >
            <RefreshCw size={13} />
          </button>
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            style={{ width: "26px", height: "26px", borderRadius: "6px", backgroundColor: "transparent", border: "1px solid #2A2A3D", color: page === 0 ? "#2A2A3D" : "#6B6B8A", cursor: page === 0 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <ChevronLeft size={13} />
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            style={{ width: "26px", height: "26px", borderRadius: "6px", backgroundColor: "transparent", border: "1px solid #2A2A3D", color: page === totalPages - 1 ? "#2A2A3D" : "#6B6B8A", cursor: page === totalPages - 1 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* 2-column grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        {visible.map((creator) => (
          <CreatorCard key={creator.id} creator={creator} onClick={() => router.push(`/${creator.username}`)} />
        ))}
      </div>

      {/* Pagination dots */}
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
        position: "relative", height: "240px",
      }}
    >
      {/* Full cover image */}
      <img
        src={creator.coverImage}
        alt={creator.name}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />

      {/* Dark gradient overlay — bottom half */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.0) 30%, rgba(0,0,0,0.85) 100%)",
      }} />

      {/* Avatar — centered, lower in the card */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -20%)",
        zIndex: 2,
      }}>
        <Avatar src={creator.avatar_url} alt={creator.name} size="lg" showRing />
      </div>

      {/* Name + username — overlaid at bottom */}
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

      {/* Stats row — very bottom */}
      <div style={{
        position: "absolute", bottom: "8px", left: 0, right: 0,
        display: "flex", justifyContent: "center", gap: "10px",
        zIndex: 2,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
          <Users size={9} color="rgba(255,255,255,0.6)" />
          <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>{creator.subscribers}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
          <Image size={9} color="rgba(255,255,255,0.6)" />
          <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>{creator.posts}</span>
        </div>
      </div>
    </div>
  );
}