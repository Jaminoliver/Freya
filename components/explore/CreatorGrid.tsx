"use client";

import { CreatorCard } from "@/components/explore/CreatorCard";

interface Creator {
  username: string;
  name: string;
  avatar: string;
  coverImage: string;
  subscribers: string;
  trending?: boolean;
}

interface CreatorGridProps {
  creators: Creator[];
}

export function CreatorGrid({ creators }: CreatorGridProps) {
  if (!creators.length) return (
    <div style={{ textAlign: "center", padding: "60px 0", color: "#6B6B8A", fontFamily: "'Inter', sans-serif" }}>
      No creators found.
    </div>
  );

  const [featured, ...rest] = creators;

  return (
    <>
      <style>{`
        .creator-grid {
          display: grid;
          gap: 12px;
          grid-template-columns: 1fr 1fr;
        }
        .creator-grid-featured {
          grid-column: span 2;
        }
        @media (min-width: 768px) {
          .creator-grid {
            grid-template-columns: 2fr 1fr 1fr;
          }
          .creator-grid-featured {
            grid-column: span 1;
            grid-row: span 2;
          }
        }
      `}</style>

      <div className="creator-grid">
        {/* Featured large card */}
        <div className="creator-grid-featured">
          <CreatorCard {...featured} large trending={featured.trending} />
        </div>

        {/* Rest of creators */}
        {rest.map((creator) => (
          <CreatorCard key={creator.username} {...creator} />
        ))}
      </div>
    </>
  );
}