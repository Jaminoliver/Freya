"use client";

import { useState } from "react";
import { PostCard } from "@/components/feed/PostCard";
import { StoryBar } from "@/components/feed/StoryBar";

export const DUMMY_POSTS = [
  {
    id: "1",
    creator: {
      name: "Freya",
      username: "freya",
      avatar_url: "https://i.pravatar.cc/150?img=47",
      isVerified: true,
    },
    timestamp: "3 hours ago",
    caption:
      "@sophiamills and @natking discover a hidden rooftop restaurant in Lagos, then explore a vibrant street art district full of murals 🤝😊 freya.com/sophiamills / freya.com/natking",
    media: [
      { type: "image" as const, url: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80" },
    ],
    isLocked: false,
    price: null,
    likes: 41,
    comments: 7,
    taggedCreators: [
      { name: "Sophia Mills", username: "sophiamills", avatar_url: "https://i.pravatar.cc/150?img=44", isVerified: true, isFree: true },
      { name: "Nat King",     username: "natking",     avatar_url: "https://i.pravatar.cc/150?img=45", isVerified: true, isFree: true },
    ],
  },
  {
    id: "2",
    creator: {
      name: "Zara Obi",
      username: "zaraobi",
      avatar_url: "https://i.pravatar.cc/150?img=43",
      isVerified: true,
    },
    timestamp: "9 hours ago",
    caption: "i'd cancel plans for you, just saying 🥰",
    media: [
      { type: "image" as const, url: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&q=80" },
    ],
    isLocked: false,
    price: null,
    likes: 128,
    comments: 23,
    taggedCreators: [],
  },
  {
    id: "3",
    creator: {
      name: "Aria Chen",
      username: "ariachen",
      avatar_url: "https://i.pravatar.cc/150?img=48",
      isVerified: true,
    },
    timestamp: "12 hours ago",
    caption: "Lagos nights hit different when you're with the right people ✨🌙",
    media: [
      { type: "image" as const, url: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80" },
    ],
    isLocked: false,
    price: null,
    likes: 89,
    comments: 14,
    taggedCreators: [],
  },
  {
    id: "4",
    creator: {
      name: "Nova Belle",
      username: "novabelle",
      avatar_url: "https://i.pravatar.cc/150?img=49",
      isVerified: false,
    },
    timestamp: "1 day ago",
    caption: "New exclusive content 🔒 Subscribe to unlock",
    media: [
      { type: "image" as const, url: "https://images.unsplash.com/photo-1502323703110-f849b5b2f8a2?w=800&q=80" },
    ],
    isLocked: true,
    price: 2500,
    likes: 204,
    comments: 31,
    taggedCreators: [],
  },
  {
    id: "5",
    creator: {
      name: "Sofia Reyes",
      username: "sofiareyes",
      avatar_url: "https://i.pravatar.cc/150?img=46",
      isVerified: true,
    },
    timestamp: "2 days ago",
    caption: "Sunday vibes and good energy only 🧘🏽‍♀️☀️",
    media: [
      { type: "image" as const, url: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&q=80" },
    ],
    isLocked: false,
    price: null,
    likes: 312,
    comments: 45,
    taggedCreators: [],
  },
];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"feed" | "spotlight">("feed");

  return (
    <div style={{ maxWidth: "680px", margin: "0 auto", padding: "0" }}>

      <style>{`
        .feed-desktop-header { display: flex; }
        @media (max-width: 767px) { .feed-desktop-header { display: none !important; } }
      `}</style>

      {/* ── Sticky header ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        backgroundColor: "rgba(10,10,15,0.9)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid #1F1F2A",
        padding: "0 16px",
      }}>
        {/* Desktop-only Feed heading */}
        <div className="feed-desktop-header" style={{ alignItems: "center", padding: "14px 0 10px" }}>
          <span style={{ fontSize: "16px", fontWeight: 700, color: "#FFFFFF" }}>Feed</span>
        </div>

      </div>

      {/* ── Story bar — below sticky header ── */}
      <div style={{
        padding: "0 16px",
        borderBottom: "1px solid #1F1F2A",
        backgroundColor: "#0A0A0F",
      }}>
        <StoryBar />
      </div>

      {/* ── Feed / Spotlight tabs — below stories ── */}
      <div style={{
        borderBottom: "1px solid #1F1F2A",
        padding: "0 16px",
        backgroundColor: "#0A0A0F",
      }}>
        <div style={{ display: "flex" }}>
          {(["feed", "spotlight"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: "12px 0",
                background: "none",
                border: "none",
                borderBottom: activeTab === tab ? "2px solid #8B5CF6" : "2px solid transparent",
                color: activeTab === tab ? "#FFFFFF" : "#6B6B8A",
                fontSize: "14px",
                fontWeight: activeTab === tab ? 700 : 400,
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
                transition: "all 0.15s",
                letterSpacing: "0.01em",
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Feed content ── */}
      <div style={{ padding: "0 0 40px" }}>
        {activeTab === "feed" ? (
          DUMMY_POSTS.map((post) => (
            <PostCard key={post.id} post={post} />
          ))
        ) : (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "60px 20px",
            color: "#4A4A6A", fontSize: "14px",
          }}>
            Spotlight coming soon ✨
          </div>
        )}
      </div>

    </div>
  );
}