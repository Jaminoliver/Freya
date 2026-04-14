"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Play, Heart, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export interface VideoTileData {
  type: "video";
  post_id: number;
  creator_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  thumbnail_url: string | null;
  bunny_video_id: string | null;
  like_count: number;
  comment_count: number;
  duration_seconds: number | null;
}

const STREAM_CDN =
  process.env.NEXT_PUBLIC_BUNNY_STREAM_CDN_HOSTNAME ?? "vz-8bc100f4-3c0.b-cdn.net";

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, "")     + "K";
  return String(n);
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const FALLBACK_AVATAR = "https://i.pravatar.cc/150?img=1";

export function VideoTile({ data }: { data: VideoTileData }) {
  const router     = useRouter();
  const tileRef    = useRef<HTMLDivElement>(null);
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [viewed, setViewed] = useState(false);

  const thumbnail =
    data.thumbnail_url ||
    (data.bunny_video_id
      ? `https://${STREAM_CDN}/${data.bunny_video_id}/thumbnail.jpg`
      : null);

  // ── Mark post as viewed (idempotent) ──────────────────────────────────────
  const markViewed = useCallback(async () => {
    if (viewed) return;
    setViewed(true); // optimistic — prevents double upsert
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("viewed_content").upsert(
        {
          user_id:    user.id,
          post_id:    data.post_id,
          creator_id: data.creator_id,
        },
        { onConflict: "user_id,post_id", ignoreDuplicates: true }
      );
    } catch (err) {
      console.error("[VideoTile] markViewed:", err);
    }
  }, [viewed, data.post_id, data.creator_id]);

  // ── Dwell tracking: 0.5 threshold, 2s timer ───────────────────────────────
  useEffect(() => {
    const el = tileRef.current;
    if (!el || viewed) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Start 2s dwell timer
          timerRef.current = setTimeout(markViewed, 2000);
        } else {
          // Tile left viewport before 2s — cancel
          if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
          }
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [viewed, markViewed]);

  // ── Click: instant mark + navigate ────────────────────────────────────────
  const handleClick = () => {
    markViewed();
    router.push(`/${data.username}?post=${data.post_id}`);
  };

  const duration = formatDuration(data.duration_seconds);

  return (
    <div
      ref={tileRef}
      onClick={handleClick}
      style={{
        position:        "relative",
        width:           "100%",
        height:          "280px",
        borderRadius:    "12px",
        overflow:        "hidden",
        cursor:          "pointer",
        backgroundColor: "#1A1A2E",
        userSelect:      "none",
      }}
    >
      {/* Thumbnail */}
      {thumbnail && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnail}
          alt=""
          style={{
            position:   "absolute",
            inset:      0,
            width:      "100%",
            height:     "100%",
            objectFit:  "cover",
          }}
        />
      )}

      {/* Gradient overlay */}
      <div
        style={{
          position:   "absolute",
          inset:      0,
          background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 45%, transparent 100%)",
        }}
      />

      {/* Play button — centred slightly above middle */}
      <div
        style={{
          position:  "absolute",
          top:       "50%",
          left:      "50%",
          transform: "translate(-50%, -60%)",
        }}
      >
        <div
          style={{
            width:           "38px",
            height:          "38px",
            borderRadius:    "50%",
            backgroundColor: "rgba(255,255,255,0.18)",
            backdropFilter:  "blur(6px)",
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "center",
          }}
        >
          <Play size={16} fill="#fff" color="#fff" style={{ marginLeft: "2px" }} />
        </div>
      </div>

      {/* Duration badge — top right */}
      {duration && (
        <div
          style={{
            position:        "absolute",
            top:             "8px",
            right:           "8px",
            backgroundColor: "rgba(0,0,0,0.55)",
            backdropFilter:  "blur(4px)",
            color:           "#fff",
            fontSize:        "10px",
            fontWeight:      600,
            padding:         "2px 6px",
            borderRadius:    "4px",
            fontFamily:      "'Inter', sans-serif",
            letterSpacing:   "0.3px",
          }}
        >
          {duration}
        </div>
      )}

      {/* Bottom info */}
      <div
        style={{
          position: "absolute",
          bottom:   "10px",
          left:     "10px",
          right:    "10px",
        }}
      >
        {/* Creator avatar + name */}
        <div
          style={{
            display:     "flex",
            alignItems:  "center",
            gap:         "6px",
            marginBottom: "6px",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.avatar_url || FALLBACK_AVATAR}
            alt={data.display_name || data.username}
            style={{
              width:        "20px",
              height:       "20px",
              borderRadius: "50%",
              border:       "1.5px solid #8B5CF6",
              objectFit:    "cover",
              flexShrink:   0,
            }}
          />
          <p
            style={{
              margin:       0,
              fontSize:     "11px",
              fontWeight:   700,
              color:        "#fff",
              fontFamily:   "'Inter', sans-serif",
              whiteSpace:   "nowrap",
              overflow:     "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {data.display_name || data.username}
          </p>
        </div>

        {/* Engagement stats */}
        <div
          style={{
            display:    "flex",
            alignItems: "center",
            gap:        "10px",
          }}
        >
          <div
            style={{
              display:    "flex",
              alignItems: "center",
              gap:        "3px",
            }}
          >
            <Heart size={11} fill="rgba(255,255,255,0.75)" color="rgba(255,255,255,0.75)" />
            <span
              style={{
                fontSize:  "10px",
                color:     "rgba(255,255,255,0.75)",
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
              }}
            >
              {formatCount(data.like_count)}
            </span>
          </div>

          <div
            style={{
              display:    "flex",
              alignItems: "center",
              gap:        "3px",
            }}
          >
            <MessageCircle size={11} color="rgba(255,255,255,0.75)" />
            <span
              style={{
                fontSize:  "10px",
                color:     "rgba(255,255,255,0.75)",
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
              }}
            >
              {formatCount(data.comment_count)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}