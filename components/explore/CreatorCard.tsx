"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StripCreator {
  creator_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  subscriber_count: number;
  is_featured: boolean;
  is_new?: boolean;
  likes_count?: number;
}

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
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

// ── Shared inner component ────────────────────────────────────────────────────

type CardVariant = "strip" | "grid";

interface CardInnerProps {
  variant: CardVariant;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  subscriber_count: number;
  likes_count: number;
  is_new?: boolean;
}

function CreatorCardInner({
  variant,
  username,
  display_name,
  avatar_url,
  banner_url,
  subscriber_count,
  likes_count,
  is_new,
}: CardInnerProps) {
  const router = useRouter();
  const [bannerError, setBannerError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const name = display_name || username;
  const initials = (name[0] ?? "?").toUpperCase();
  const isStrip = variant === "strip";
  const className = isStrip ? "cc-strip" : "cc-grid";

  return (
    <>
      <style>{`
        .cc-strip {
          flex-shrink: 0;
          width: 200px;
          height: 270px;
          border-radius: 14px;
          overflow: hidden;
          cursor: pointer;
          position: relative;
          scroll-snap-align: start;
          border: 1px solid #2A2A3D;
          transition: border-color 0.15s ease, transform 0.15s ease;
          background-color: #1A1A2E;
        }
        .cc-strip:hover {
          border-color: #8B5CF6;
          transform: translateY(-2px);
        }
        @media (max-width: 480px) {
          .cc-strip { width: 170px; height: 240px; }
        }
        .cc-grid {
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
        .cc-grid:hover {
          border-color: #8B5CF6;
          transform: translateY(-2px);
        }
      `}</style>

      <div className={className} onClick={() => router.push(`/${username}`)}>
        {/* Banner */}
        {banner_url && !bannerError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={banner_url}
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

        {/* New badge */}
        {is_new && (
          <div
            style={{
              position: "absolute",
              top: "10px",
              left: "10px",
              background: "#8B5CF6",
              color: "#fff",
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.4px",
              padding: "3px 7px",
              borderRadius: "4px",
              zIndex: 2,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            New
          </div>
        )}

        {/* Avatar */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -38%)",
            zIndex: 2,
          }}
        >
          <div
            style={{
              width: "68px",
              height: "68px",
              borderRadius: "50%",
              padding: "2px",
              background: "conic-gradient(#C45F8C, #8B3FBF, #C45F8C)",
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                overflow: "hidden",
                border: "2px solid #0A0A0F",
              }}
            >
              {avatar_url && !avatarError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatar_url}
                  alt={name}
                  loading="lazy"
                  onError={() => setAvatarError(true)}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    background: "#8B5CF6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontSize: "24px",
                    fontWeight: 700,
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {initials}
                </div>
              )}
            </div>
          </div>
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
            @{username}
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
              {formatCount(subscriber_count)}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.9)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.85)", fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>
              {formatCount(likes_count)}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Public exports ────────────────────────────────────────────────────────────

/** Strip variant — used by FeaturedStrip */
export function CreatorCard(props: StripCreator) {
  return (
    <CreatorCardInner
      variant="strip"
      username={props.username}
      display_name={props.display_name}
      avatar_url={props.avatar_url}
      banner_url={props.banner_url}
      subscriber_count={props.subscriber_count}
      likes_count={props.likes_count ?? 0}
      is_new={props.is_new}
    />
  );
}

/** Grid variant — used by CreatorGrid */
export function IdentityCard({ data }: { data: IdentityCardData }) {
  return (
    <CreatorCardInner
      variant="grid"
      username={data.username}
      display_name={data.display_name}
      avatar_url={data.avatar_url}
      banner_url={data.banner_url}
      subscriber_count={data.subscriber_count}
      likes_count={data.likes_count}
    />
  );
}