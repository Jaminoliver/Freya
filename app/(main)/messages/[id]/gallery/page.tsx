"use client";

import { use, useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { MediaLightbox } from "@/components/messages/MediaLightbox";

interface MediaItem {
  id:           number;
  messageId:    number;
  url:          string | null;
  thumbnailUrl: string | null;
  mediaType:    "image" | "video";
  isPPV:        boolean;
  isUnlocked:   boolean;
  isSender:     boolean;
  createdAt:    string;
}

type Filter = "all" | "images" | "videos" | "unlocked";

function groupByMonth(items: MediaItem[]): { label: string; items: MediaItem[] }[] {
  const map = new Map<string, MediaItem[]>();
  for (const item of items) {
    const date  = new Date(item.createdAt);
    const label = date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(item);
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

// Renders a thumbnail for a single media item.
// For videos without a thumbnailUrl, we use a hidden <video> element
// and draw its first frame onto a <canvas> — works on all desktop browsers.
function VideoThumb({
  src,
  blurred,
  style,
}: {
  src: string;
  blurred: boolean;
  style?: React.CSSProperties;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef  = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const handleSeeked = () => {
      try {
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width  = video.videoWidth  || 320;
        canvas.height = video.videoHeight || 320;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setReady(true);
      } catch {
        // cross-origin or decode error – canvas stays hidden, video stays visible
      }
    };

    video.addEventListener("seeked", handleSeeked);
    video.currentTime = 0.001; // trigger seeked

    return () => video.removeEventListener("seeked", handleSeeked);
  }, [src]);

  const sharedStyle: React.CSSProperties = {
    position:   "absolute",
    inset:      0,
    width:      "100%",
    height:     "100%",
    objectFit:  "cover",
    filter:     blurred ? "blur(8px) brightness(0.6)" : "none",
    ...style,
  };

  return (
    <>
      {/* Hidden video used only to extract the first frame */}
      <video
        ref={videoRef}
        src={src}
        muted
        playsInline
        preload="metadata"
        crossOrigin="anonymous"
        style={{ display: "none" }}
      />

      {/* Canvas shows the extracted frame (desktop) */}
      <canvas
        ref={canvasRef}
        style={{ ...sharedStyle, display: ready ? "block" : "none" }}
      />

      {/* Fallback: visible video poster (works on iOS Safari natively) */}
      {!ready && (
        <video
          src={`${src}#t=0.001`}
          muted
          playsInline
          preload="metadata"
          style={sharedStyle}
        />
      )}
    </>
  );
}

function MediaThumb({ item }: { item: MediaItem }) {
  const blurred = !item.isUnlocked;

  // Image — or video with an explicit thumbnailUrl
  if (item.mediaType === "image" || (item.mediaType === "video" && item.thumbnailUrl)) {
    const src = item.thumbnailUrl ?? item.url;
    if (!src) return <div style={{ width: "100%", height: "100%", backgroundColor: "#1E1E2E" }} />;
    return (
      <img
        src={src}
        alt=""
        style={{
          width: "100%", height: "100%", objectFit: "cover",
          filter: blurred ? "blur(8px) brightness(0.6)" : "none",
        }}
      />
    );
  }

  // Video without thumbnailUrl — extract first frame via canvas
  if (item.mediaType === "video" && item.url) {
    return (
      <VideoThumb
        src={item.url}
        blurred={blurred}
      />
    );
  }

  return <div style={{ width: "100%", height: "100%", backgroundColor: "#1E1E2E" }} />;
}

export default function GalleryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }   = use(params);
  const router   = useRouter();

  const [filter,      setFilter]      = useState<Filter>("all");

  const [items,       setItems]       = useState<MediaItem[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor,  setNextCursor]  = useState<string | null>(null);
  const [hasMore,     setHasMore]     = useState(true);
  const [lightbox,    setLightbox]    = useState<{ items: { url: string; type: "image" | "video"; messageId: number }[]; initialIndex: number } | null>(null);

  const loaderRef = useRef<HTMLDivElement>(null);

  const fetchMedia = useCallback(async (cursor: string | null, currentFilter: Filter, reset = false) => {
    if (reset) setLoading(true); else setLoadingMore(true);
    try {
      const params = new URLSearchParams({ filter: currentFilter });
      if (cursor) params.set("cursor", cursor);
      const res  = await fetch(`/api/conversations/${id}/media?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      const incoming: MediaItem[] = data.mediaItems ?? [];
      setItems((prev) => reset ? incoming : [...prev, ...incoming]);
      setNextCursor(data.nextCursor ?? null);
      setHasMore(!!data.nextCursor);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [id]);

  // Initial load + filter change
  useEffect(() => {
    setItems([]);
    setNextCursor(null);
    setHasMore(true);
    fetchMedia(null, filter, true);
  }, [filter, fetchMedia]);

  // Infinite scroll observer
  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          fetchMedia(nextCursor, filter);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, nextCursor, filter, fetchMedia]);

  const openLightbox = (clickedItem: MediaItem) => {
    const unlocked = items.filter((i) => i.isUnlocked && i.url);
    const lightboxItems = unlocked.map((i) => ({
      url:       i.url!,
      type:      i.mediaType,
      messageId: i.messageId,
    }));
    const idx = unlocked.findIndex((i) => i.id === clickedItem.id);
    setLightbox({ items: lightboxItems, initialIndex: Math.max(0, idx) });
  };

  const groups = groupByMonth(items);

  const filters: { key: Filter; label: string }[] = [
    { key: "all",      label: "All"      },
    { key: "unlocked", label: "Unlocked" },
    { key: "images",   label: "Images"   },
    { key: "videos",   label: "Videos"   },
  ];

  return (
    <>
      <style>{`
        .gallery-root {
          display: flex; flex-direction: column; height: 100%; max-height: 100%;
          background-color: #0A0A0F; font-family: 'Inter', sans-serif;
        }
        @media (max-width: 767px) {
          .gallery-root {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            z-index: 100;
            padding-top: env(safe-area-inset-top, 0px);
            padding-bottom: env(safe-area-inset-bottom, 0px);
          }
        }
        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2px;
        }
        .gallery-thumb {
          position: relative;
          aspect-ratio: 1;
          overflow: hidden;
          cursor: pointer;
          background-color: #1E1E2E;
        }
        .gallery-thumb:hover .thumb-inner { transform: scale(1.04); }
        .gallery-thumb:active .thumb-inner { transform: scale(0.97); }
        .thumb-inner {
          position: absolute; inset: 0;
          transition: transform 0.2s ease;
        }
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        .skeleton {
          background: linear-gradient(90deg, #1E1E2E 25%, #2A2A3D 50%, #1E1E2E 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
          aspect-ratio: 1;
        }
      `}</style>

      {lightbox && (
        <MediaLightbox
          items={lightbox.items}
          initialIndex={lightbox.initialIndex}
          onClose={() => setLightbox(null)}
        />
      )}

      <div className="gallery-root">
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "0 16px", height: "56px", flexShrink: 0, backgroundColor: "#0D0D1A", borderBottom: "1px solid #1E1E2E" }}>
          <button
            onClick={() => router.back()}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#A3A3C2", display: "flex", alignItems: "center", padding: "4px", borderRadius: "6px", flexShrink: 0 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#A3A3C2")}
          >
            <ArrowLeft size={20} strokeWidth={1.8} />
          </button>
          <div>
            <p style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#FFFFFF" }}>Chat Gallery</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: "8px", padding: "12px 16px", flexShrink: 0, borderBottom: "1px solid #1E1E2E", overflowX: "auto", scrollbarWidth: "none" }}>
          {filters.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                padding:         "6px 16px",
                borderRadius:    "20px",
                border:          `1px solid ${filter === key ? "#8B5CF6" : "#2A2A3D"}`,
                backgroundColor: filter === key ? "#8B5CF6" : "transparent",
                color:           filter === key ? "#FFFFFF" : "#A3A3C2",
                fontSize:        "13px",
                fontWeight:      filter === key ? 600 : 400,
                cursor:          "pointer",
                whiteSpace:      "nowrap",
                fontFamily:      "'Inter', sans-serif",
                transition:      "all 0.15s ease",
                flexShrink:      0,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" }}>
          {loading ? (
            <div className="gallery-grid" style={{ padding: "2px" }}>
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="skeleton" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "200px", gap: "12px" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "#1E1E2E", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="#4A4A6A" strokeWidth="1.5"/>
                  <rect x="12" y="3" width="7" height="7" rx="1.5" stroke="#4A4A6A" strokeWidth="1.5"/>
                  <rect x="3" y="12" width="7" height="7" rx="1.5" stroke="#4A4A6A" strokeWidth="1.5"/>
                  <rect x="12" y="12" width="7" height="7" rx="1.5" stroke="#4A4A6A" strokeWidth="1.5"/>
                </svg>
              </div>
              <p style={{ margin: 0, fontSize: "14px", color: "#4A4A6A" }}>No media found</p>
            </div>
          ) : (
            <div style={{ padding: "0 0 16px" }}>
              {groups.map(({ label, items: groupItems }) => (
                <div key={label}>
                  {/* Month header */}
                  <div style={{ padding: "12px 16px 8px", position: "sticky", top: 0, backgroundColor: "#0A0A0F", zIndex: 10 }}>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#4A4A6A", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      {label}
                    </span>
                  </div>

                  <div className="gallery-grid">
                    {groupItems.map((item) => (
                      <div
                        key={item.id}
                        className="gallery-thumb"
                        onClick={() => item.isUnlocked ? openLightbox(item) : undefined}
                        style={{ cursor: item.isUnlocked ? "pointer" : "default" }}
                      >
                        <div className="thumb-inner">
                          <MediaThumb item={item} />
                        </div>

                        {/* Video play icon */}
                        {item.mediaType === "video" && item.isUnlocked && (
                          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                            <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
                                <path d="M1.5 1.5L10.5 7L1.5 12.5V1.5Z" fill="#FFFFFF" />
                              </svg>
                            </div>
                          </div>
                        )}

                        {/* PPV lock overlay */}
                        {item.isPPV && !item.isUnlocked && (
                          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px", backgroundColor: "rgba(0,0,0,0.3)" }}>
                            <Lock size={18} color="#FFFFFF" strokeWidth={1.8} />
                            <span style={{ fontSize: "10px", color: "#FFFFFF", fontWeight: 600 }}>PPV</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Infinite scroll trigger */}
              <div ref={loaderRef} style={{ height: "40px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {loadingMore && (
                  <div style={{ width: "18px", height: "18px", borderRadius: "50%", border: "2px solid #2A2A3D", borderTopColor: "#8B5CF6", animation: "spin 0.7s linear infinite" }} />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}