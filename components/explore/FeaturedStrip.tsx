"use client";

import { useRef } from "react";
import { CreatorCard, type StripCreator } from "@/components/explore/CreatorCard";

interface FeaturedStripProps {
  creators: StripCreator[];
}

export function FeaturedStrip({ creators }: FeaturedStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!creators.length) return null;

  return (
    <div style={{ marginBottom: "20px" }}>
      {/* Section label */}
      <p
        style={{
          margin: "0 0 10px 2px",
          fontSize: "16px",
          fontWeight: 700,
          color: "#FFFFFF",
          fontFamily: "'Inter', sans-serif",
          letterSpacing: "0.3px",
        }}
      >
        Featured
      </p>

      {/* Horizontal scroll row */}
      <style>{`.strip-scroll::-webkit-scrollbar { display: none; }`}</style>
      <div
        ref={scrollRef}
        className="strip-scroll"
        style={{
          display: "flex",
          gap: "10px",
          overflowX: "auto",
          scrollbarWidth: "none",
          paddingBottom: "4px",
        }}
      >
        {creators.map((creator) => (
          <CreatorCard key={creator.creator_id} {...creator} />
        ))}
      </div>
    </div>
  );
}