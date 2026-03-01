"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface MediaItem {
  id: number;
  media_type: string;
  file_url: string | null;
  thumbnail_url: string | null;
  raw_video_url: string | null;
  locked: boolean;
  display_order: number;
  processing_status: string | null;
  bunny_video_id: string | null;
}

export default function ImageCarousel({ media, onImageClick }: {
  media: MediaItem[];
  onImageClick?: () => void;
}) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [isDesktop,   setIsDesktop]   = React.useState(false);
  const trackRef   = React.useRef<HTMLDivElement>(null);
  const startXRef  = React.useRef<number | null>(null);
  const isDragging = React.useRef(false);

  React.useEffect(() => {
    const check = () => setIsDesktop(window.matchMedia("(hover: hover) and (pointer: fine)").matches);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const goTo = (index: number) => {
    if (!trackRef.current) return;
    setActiveIndex(index);
    trackRef.current.scrollTo({ left: trackRef.current.offsetWidth * index, behavior: "smooth" });
  };

  const onScroll = () => {
    if (!trackRef.current) return;
    const index = Math.round(trackRef.current.scrollLeft / trackRef.current.offsetWidth);
    setActiveIndex(index);
  };

  const handleTouchStart = (e: React.TouchEvent) => { startXRef.current = e.touches[0].clientX; };
  const handleTouchEnd   = (e: React.TouchEvent) => {
    if (startXRef.current === null) return;
    const diff = startXRef.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0 && activeIndex < media.length - 1) goTo(activeIndex + 1);
      if (diff < 0 && activeIndex > 0) goTo(activeIndex - 1);
    }
    startXRef.current = null;
  };

  const handleMouseDown = (e: React.MouseEvent) => { startXRef.current = e.clientX; isDragging.current = false; };
  const handleMouseMove = (e: React.MouseEvent) => { if (startXRef.current !== null && Math.abs(e.clientX - startXRef.current) > 5) isDragging.current = true; };
  const handleMouseUp   = (e: React.MouseEvent) => {
    if (startXRef.current === null) return;
    const diff = startXRef.current - e.clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0 && activeIndex < media.length - 1) goTo(activeIndex + 1);
      if (diff < 0 && activeIndex > 0) goTo(activeIndex - 1);
    } else if (!isDragging.current) {
      onImageClick?.();
    }
    startXRef.current = null;
    isDragging.current = false;
  };

  const arrowStyle = (side: "left" | "right"): React.CSSProperties => ({
    position:        "absolute",
    [side]:          "10px",
    top:             "50%",
    transform:       "translateY(-50%)",
    zIndex:          10,
    width:           "32px",
    height:          "32px",
    borderRadius:    "50%",
    backgroundColor: "rgba(0,0,0,0.5)",
    backdropFilter:  "blur(4px)",
    border:          "none",
    color:           "#fff",
    cursor:          "pointer",
    display:         "flex",
    alignItems:      "center",
    justifyContent:  "center",
  });

  return (
    <div style={{ position: "relative", width: "100%", backgroundColor: "#000", userSelect: "none" }}>
      <div
        ref={trackRef}
        onScroll={onScroll}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ display: "flex", overflowX: "scroll", scrollSnapType: "x mandatory", scrollbarWidth: "none", WebkitOverflowScrolling: "touch", cursor: media.length > 1 ? "grab" : "pointer" }}
      >
        {media.map((item, i) => (
          <div key={i} style={{ flexShrink: 0, width: "100%", scrollSnapAlign: "start", position: "relative", backgroundColor: "#000" }}>
            <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "80px", backgroundImage: `url(${item.file_url})`, backgroundSize: "cover", backgroundPosition: "left center", filter: "blur(16px) brightness(0.7)", transform: "scaleX(1.3)", opacity: 0.9, pointerEvents: "none" }} />
            <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: "80px", backgroundImage: `url(${item.file_url})`, backgroundSize: "cover", backgroundPosition: "right center", filter: "blur(16px) brightness(0.7)", transform: "scaleX(1.3)", opacity: 0.9, pointerEvents: "none" }} />
            <img src={item.file_url ?? ""} alt="" draggable={false} style={{ position: "relative", zIndex: 1, width: "100%", height: "auto", maxHeight: "80vh", objectFit: "contain", display: "block", pointerEvents: "none" }} />
          </div>
        ))}
      </div>

      {media.length > 1 && (
        <div style={{ position: "absolute", top: "10px", right: "10px", zIndex: 10, backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)", borderRadius: "20px", padding: "3px 10px", fontSize: "12px", fontWeight: 600, color: "#fff", fontFamily: "'Inter', sans-serif" }}>
          {activeIndex + 1} / {media.length}
        </div>
      )}

      {isDesktop && media.length > 1 && activeIndex > 0 && (
        <button onClick={() => goTo(activeIndex - 1)} style={arrowStyle("left")}>
          <ChevronLeft size={18} />
        </button>
      )}
      {isDesktop && media.length > 1 && activeIndex < media.length - 1 && (
        <button onClick={() => goTo(activeIndex + 1)} style={arrowStyle("right")}>
          <ChevronRight size={18} />
        </button>
      )}

      {media.length > 1 && (
        <div style={{ position: "absolute", bottom: "10px", left: "50%", transform: "translateX(-50%)", zIndex: 10, display: "flex", alignItems: "center", gap: "5px" }}>
          {media.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              style={{
                width:           i === activeIndex ? "18px" : "6px",
                height:          "6px",
                borderRadius:    "3px",
                border:          "none",
                backgroundColor: i === activeIndex ? "#fff" : "rgba(255,255,255,0.45)",
                cursor:          "pointer",
                padding:         0,
                transition:      "all 0.25s",
                flexShrink:      0,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}