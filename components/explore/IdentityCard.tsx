"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreatorStory } from "@/lib/hooks/useCreatorStory";
import { AvatarWithStoryRing } from "@/components/ui/AvatarWithStoryRing";
import StoryViewer from "@/components/story/StoryViewer";

export interface IdentityCardData {
  type: "identity";
  creator_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  subscriber_count: number;
  likes_count: number;
  categories: string[];
  is_free?: boolean;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

export function IdentityCard({ data }: { data: IdentityCardData }) {
  const router = useRouter();
  const [bannerError, setBannerError] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);

  const { group, hasStory, hasUnviewed, refresh } = useCreatorStory(data.creator_id);

  const name = data.display_name || data.username;
  const initials = (name[0] ?? "?").toUpperCase();

  return (
    <>
      <style>{`
        .identity-card {
          position: relative;
          width: 100%;
          height: 280px;
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
          background-color: #1A1A2E;
          border: 1px solid #2A2A3D;
          transition: border-color 0.15s ease, transform 0.15s ease;
        }
        .identity-card:hover {
          border-color: #8B5CF6;
          transform: translateY(-2px);
        }
      `}</style>

      <div
        className="identity-card"
        onClick={() => router.push(`/${data.username}`)}
      >
        {/* Banner */}
        {data.banner_url && !bannerError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.banner_url}
            alt=""
            loading="lazy"
            onError={() => setBannerError(true)}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(135deg, #1A1A2E 0%, #2A2A3D 100%)",
            }}
          />
        )}

        {/* Gradient overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0) 25%, rgba(0,0,0,0.92) 100%)",
          }}
        />

        {/* Free badge */}
        {data.is_free && (
          <span style={{
            position: "absolute", top: "10px", left: "10px",
            backgroundColor: "rgba(16,185,129,0.85)", backdropFilter: "blur(6px)",
            borderRadius: "20px", padding: "4px 12px", fontSize: "11px",
            fontWeight: 700, color: "#fff", zIndex: 2,
            fontFamily: "'Inter', sans-serif",
          }}>
            Free
          </span>
        )}

        {/* Avatar */}
        {storyOpen && group && (
          <StoryViewer groups={[group]} startGroupIndex={0} onClose={() => { setStoryOpen(false); refresh(); }} />
        )}
        <div
          style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -38%)", zIndex: 2 }}
          onClick={(e) => { e.stopPropagation(); if (hasStory && group) setStoryOpen(true); }}
        >
          <AvatarWithStoryRing
            src={data.avatar_url}
            alt={name}
            size={64}
            hasStory={hasStory}
            hasUnviewed={hasUnviewed}
            borderColor="#0A0A0F"
          />
        </div>

        {/* Name + username */}
        <div
          style={{
            position: "absolute",
            bottom: "36px",
            left: 0,
            right: 0,
            zIndex: 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "0 10px",
            gap: "3px",
          }}
        >
          <span
            style={{
              fontSize: "15px",
              fontWeight: 700,
              color: "#fff",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "160px",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {name}
          </span>
          <span
            style={{
              fontSize: "12px",
              color: "rgba(255,255,255,0.5)",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            @{data.username}
          </span>
        </div>

        {/* Stats */}
        <div
          style={{
            position: "absolute",
            bottom: "12px",
            left: 0,
            right: 0,
            zIndex: 2,
            display: "flex",
            justifyContent: "center",
            gap: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="rgba(250,192,50,0.15)" stroke="#F5C842" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 18h20" />
              <path d="M4 18L2 8l4.5 4L12 4l5.5 8L22 8l-2 10H4z" />
              <circle cx="12" cy="4" r="1.2" fill="#F5C842" stroke="none" />
              <circle cx="6.5" cy="12" r="1" fill="rgba(245,200,66,0.7)" stroke="none" />
              <circle cx="17.5" cy="12" r="1" fill="rgba(245,200,66,0.7)" stroke="none" />
            </svg>
            <span style={{ fontSize: "12px", color: "#F5C842", fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>
              {formatCount(data.subscriber_count)}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.9)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.85)", fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>
              {formatCount(data.likes_count)}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}