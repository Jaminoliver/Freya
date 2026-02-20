"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { FilterTabs } from "@/components/explore/FilterTabs";
import { CreatorGrid } from "@/components/explore/CreatorGrid";

const SAMPLE_CREATORS = [
  {
    username: "sophiamartinez",
    name: "Sophia Martinez",
    avatar: "https://i.pravatar.cc/150?img=47",
    coverImage: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&q=80",
    subscribers: "39.6K",
    trending: true,
  },
  {
    username: "isabellachen",
    name: "Isabella Chen",
    avatar: "https://i.pravatar.cc/150?img=45",
    coverImage: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=800&q=80",
    subscribers: "44.8K",
  },
  {
    username: "emmarodriguez",
    name: "Emma Rodriguez",
    avatar: "https://i.pravatar.cc/150?img=44",
    coverImage: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=80",
    subscribers: "13.6K",
  },
  {
    username: "oliviaanderson",
    name: "Olivia Anderson",
    avatar: "https://i.pravatar.cc/150?img=49",
    coverImage: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&q=80",
    subscribers: "28.1K",
    trending: true,
  },
  {
    username: "avathompson",
    name: "Ava Thompson",
    avatar: "https://i.pravatar.cc/150?img=48",
    coverImage: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80",
    subscribers: "19.4K",
  },
  {
    username: "lunabelle",
    name: "Luna Belle",
    avatar: "https://i.pravatar.cc/150?img=43",
    coverImage: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&q=80",
    subscribers: "15.7K",
  },
  {
    username: "niathompson",
    name: "Nia Thompson",
    avatar: "https://i.pravatar.cc/150?img=41",
    coverImage: "https://images.unsplash.com/photo-1502764613149-7f1d229e230f?w=800&q=80",
    subscribers: "6.9K",
  },
];

export default function ExplorePage() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = SAMPLE_CREATORS.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    if (activeFilter === "trending") return matchesSearch && c.trending;
    return matchesSearch;
  });

  return (
    <div style={{
      padding: "24px 20px 80px",
      maxWidth: "100%",
      fontFamily: "'Inter', sans-serif",
      backgroundColor: "#0A0A0F",
      minHeight: "100vh",
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "20px",
        gap: "16px",
        flexWrap: "wrap",
      }}>
        <h1 style={{ margin: 0, fontSize: "26px", fontWeight: 800, color: "#F1F5F9" }}>
          Discover
        </h1>

        {/* Search */}
        <div style={{ position: "relative", flex: 1, maxWidth: "360px", minWidth: "200px" }}>
          <Search size={15} style={{
            position: "absolute", left: "14px", top: "50%",
            transform: "translateY(-50%)", color: "#6B6B8A",
          }} />
          <input
            type="text"
            placeholder="Search creators..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              borderRadius: "20px",
              padding: "10px 16px 10px 38px",
              fontSize: "14px",
              outline: "none",
              backgroundColor: "#1E1E2E",
              border: "1.5px solid #2A2A3D",
              color: "#F1F5F9",
              boxSizing: "border-box",
              fontFamily: "'Inter', sans-serif",
            }}
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ marginBottom: "20px" }}>
        <FilterTabs active={activeFilter} onChange={setActiveFilter} />
      </div>

      {/* Grid */}
      <CreatorGrid creators={filtered} />
    </div>
  );
}