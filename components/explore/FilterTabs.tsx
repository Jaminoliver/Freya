"use client";

import { useRef } from "react";

export type FilterId =
  | "all"
  | "trending"
  | "new"
  | "toprated"
  | "nigerian"
  | "photos"
  | "videos";

const filters: { id: FilterId; label: string }[] = [
  { id: "all",      label: "All"         },
  { id: "trending", label: "Trending 🔥" },
  { id: "new",      label: "New ✨"      },
  { id: "toprated", label: "Top Rated"   },
  { id: "nigerian", label: "Nigerian 🇳🇬" },
  { id: "photos",   label: "Photos"      },
  { id: "videos",   label: "Videos"      },
];

interface FilterTabsProps {
  active: FilterId;
  onChange: (id: FilterId) => void;
}

export function FilterTabs({ active, onChange }: FilterTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <style>{`
        .filter-scroll::-webkit-scrollbar { display: none; }
      `}</style>
      <div
        ref={scrollRef}
        className="filter-scroll"
        style={{
          display: "flex",
          gap: "8px",
          overflowX: "auto",
          scrollbarWidth: "none",
          paddingBottom: "2px",
        }}
      >
        {filters.map(({ id, label }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              style={{
                flexShrink: 0,
                padding: "8px 16px",
                borderRadius: "20px",
                fontSize: "13px",
                fontWeight: isActive ? 600 : 400,
                cursor: "pointer",
                border: isActive ? "none" : "1.5px solid #2A2A3D",
                backgroundColor: isActive ? "#8B5CF6" : "transparent",
                color: isActive ? "#fff" : "#A3A3C2",
                fontFamily: "'Inter', sans-serif",
                transition: "all 0.15s ease",
                whiteSpace: "nowrap",
                outline: "none",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </>
  );
}