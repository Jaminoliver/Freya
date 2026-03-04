"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

function PlaceholderAvatar({ seed, size = 72 }: { seed: string; size?: number }) {
  const colors = [
    "#8B5CF6", "#EC4899", "#F59E0B", "#10B981",
    "#3B82F6", "#EF4444", "#06B6D4", "#84CC16",
  ];
  const bg     = colors[seed.charCodeAt(0) % colors.length];
  const letter = seed[0]?.toUpperCase() ?? "?";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ borderRadius: "50%", display: "block" }}>
      <circle cx={size / 2} cy={size / 2} r={size / 2} fill={bg} />
      <text
        x="50%" y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        fill="#fff"
        fontSize={size * 0.38}
        fontFamily="Inter, sans-serif"
        fontWeight="700"
      >
        {letter}
      </text>
    </svg>
  );
}

const DUMMY_STORIES = [
  { id: "1", username: "zaraobi",     hasStory: true  },
  { id: "2", username: "freya",       hasStory: true  },
  { id: "3", username: "ariachen",    hasStory: true  },
  { id: "4", username: "novabelle",   hasStory: true  },
  { id: "5", username: "sofiareyes",  hasStory: false },
  { id: "6", username: "sophiamills", hasStory: true  },
  { id: "7", username: "natking",     hasStory: true  },
  { id: "8", username: "lunaxo",      hasStory: false },
];

export function StoryBar() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "right" ? 200 : -200, behavior: "smooth" });
  };

  return (
    <>
      <style>{`
        .story-arrow { display: flex; }
        /* On mobile: hide arrows, native touch scroll handles it */
        @media (max-width: 767px) { .story-arrow { display: none !important; } }

        .story-scroll { padding: 4px 36px; }
        @media (max-width: 767px) { .story-scroll { padding: 4px 0; } }
      `}</style>

      <div style={{ position: "relative", padding: "12px 0 4px" }}>

        {/* Left arrow — desktop only */}
        <button
          className="story-arrow"
          onClick={() => scroll("left")}
          style={{
            position: "absolute", left: "0", top: "50%", transform: "translateY(-50%)",
            zIndex: 2, width: "28px", height: "28px", borderRadius: "50%",
            border: "1px solid #2A2A3D", backgroundColor: "rgba(13,13,24,0.9)",
            backdropFilter: "blur(8px)", color: "#A3A3C2",
            alignItems: "center", justifyContent: "center",
            cursor: "pointer", transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#1C1C2E";
            e.currentTarget.style.color = "#fff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(13,13,24,0.9)";
            e.currentTarget.style.color = "#A3A3C2";
          }}
        >
          <ChevronLeft size={15} />
        </button>

        {/* Scrollable row */}
        <div
          ref={scrollRef}
          className="story-scroll"
          style={{
            display: "flex", gap: "16px", overflowX: "auto",
            scrollbarWidth: "none", msOverflowStyle: "none",
          }}
        >
          {DUMMY_STORIES.map((s) => (
            <div
              key={s.id}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", flexShrink: 0, cursor: "pointer" }}
            >
              <div style={{
                padding: "2.5px", borderRadius: "50%",
                background: s.hasStory ? "linear-gradient(to right, #8B5CF6, #EC4899)" : "#2A2A3D",
              }}>
                <div style={{ padding: "2.5px", borderRadius: "50%", backgroundColor: "#0A0A0F" }}>
                  <PlaceholderAvatar seed={s.username} size={72} />
                </div>
              </div>
              <span style={{
                fontSize: "11px", color: "#8A8AA0",
                maxWidth: "60px", overflow: "hidden",
                textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "center",
              }}>
                {s.username}
              </span>
            </div>
          ))}
        </div>

        {/* Right arrow — desktop only */}
        <button
          className="story-arrow"
          onClick={() => scroll("right")}
          style={{
            position: "absolute", right: "0", top: "50%", transform: "translateY(-50%)",
            zIndex: 2, width: "28px", height: "28px", borderRadius: "50%",
            border: "1px solid #2A2A3D", backgroundColor: "rgba(13,13,24,0.9)",
            backdropFilter: "blur(8px)", color: "#A3A3C2",
            alignItems: "center", justifyContent: "center",
            cursor: "pointer", transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#1C1C2E";
            e.currentTarget.style.color = "#fff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(13,13,24,0.9)";
            e.currentTarget.style.color = "#A3A3C2";
          }}
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </>
  );
}