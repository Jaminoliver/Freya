"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const DUMMY_STORIES = [
  { id: "1", username: "zaraobi",     avatar_url: "https://i.pravatar.cc/150?img=43", hasStory: true  },
  { id: "2", username: "freya",       avatar_url: "https://i.pravatar.cc/150?img=47", hasStory: true  },
  { id: "3", username: "ariachen",    avatar_url: "https://i.pravatar.cc/150?img=48", hasStory: true  },
  { id: "4", username: "novabelle",   avatar_url: "https://i.pravatar.cc/150?img=49", hasStory: true  },
  { id: "5", username: "sofiareyes",  avatar_url: "https://i.pravatar.cc/150?img=46", hasStory: false },
  { id: "6", username: "sophiamills", avatar_url: "https://i.pravatar.cc/150?img=44", hasStory: true  },
  { id: "7", username: "natking",     avatar_url: "https://i.pravatar.cc/150?img=45", hasStory: true  },
  { id: "8", username: "lunaxo",      avatar_url: "https://i.pravatar.cc/150?img=41", hasStory: false },
];

export function StoryBar() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "right" ? 200 : -200, behavior: "smooth" });
  };

  return (
    <div className="story-bar-wrap" style={{ position: "relative", padding: "12px 0 4px" }}>
      <style>{`
        @media (max-width: 767px) {
          .story-bar-wrap { padding-top: 64px !important; }
        }
      `}</style>

      {/* Left arrow */}
      <button
        onClick={() => scroll("left")}
        style={{
          position: "absolute", left: "0", top: "50%", transform: "translateY(-50%)",
          zIndex: 2,
          width: "28px", height: "28px",
          borderRadius: "50%",
          border: "1px solid #2A2A3D",
          backgroundColor: "rgba(13,13,24,0.9)",
          backdropFilter: "blur(8px)",
          color: "#A3A3C2",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
          transition: "all 0.15s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1C1C2E";
          (e.currentTarget as HTMLButtonElement).style.color = "#fff";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(13,13,24,0.9)";
          (e.currentTarget as HTMLButtonElement).style.color = "#A3A3C2";
        }}
      >
        <ChevronLeft size={15} />
      </button>

      {/* Scrollable row */}
      <div
        ref={scrollRef}
        style={{
          display: "flex",
          gap: "16px",
          overflowX: "auto",
          scrollbarWidth: "none",
          padding: "4px 36px",
          msOverflowStyle: "none",
        }}
      >
        {DUMMY_STORIES.map((s) => (
          <div
            key={s.id}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "6px",
              flexShrink: 0,
              cursor: "pointer",
            }}
          >
            {/* Avatar with app gradient ring */}
            <div style={{
              padding: "2.5px",
              borderRadius: "50%",
              background: s.hasStory
                ? "linear-gradient(to right, #8B5CF6, #EC4899)"
                : "#2A2A3D",
            }}>
              <div style={{
                padding: "2.5px",
                borderRadius: "50%",
                backgroundColor: "#0A0A0F",
              }}>
                <img
                  src={s.avatar_url}
                  alt={s.username}
                  style={{
                    width: "72px", height: "72px",
                    borderRadius: "50%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              </div>
            </div>

            {/* Username */}
            <span style={{
              fontSize: "11px",
              color: "#8A8AA0",
              maxWidth: "60px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              textAlign: "center",
            }}>
              {s.username}
            </span>
          </div>
        ))}
      </div>

      {/* Right arrow */}
      <button
        onClick={() => scroll("right")}
        style={{
          position: "absolute", right: "0", top: "50%", transform: "translateY(-50%)",
          zIndex: 2,
          width: "28px", height: "28px",
          borderRadius: "50%",
          border: "1px solid #2A2A3D",
          backgroundColor: "rgba(13,13,24,0.9)",
          backdropFilter: "blur(8px)",
          color: "#A3A3C2",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
          transition: "all 0.15s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1C1C2E";
          (e.currentTarget as HTMLButtonElement).style.color = "#fff";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(13,13,24,0.9)";
          (e.currentTarget as HTMLButtonElement).style.color = "#A3A3C2";
        }}
      >
        <ChevronRight size={15} />
      </button>

    </div>
  );
}