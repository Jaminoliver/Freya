// components/shared/PostHeader.tsx
"use client";

import * as React from "react";
import { BadgeCheck } from "lucide-react";
import { AvatarWithStoryRing } from "@/components/ui/AvatarWithStoryRing";

interface PostHeaderProps {
  avatarUrl:         string | null;
  displayName:       string;
  username:          string;
  isVerified:        boolean;
  timestamp:         string;
  hasStory?:         boolean;
  hasUnviewedStory?: boolean;
  onAvatarClick?:    (e: React.MouseEvent) => void;
  onNameClick?:      () => void;
  suffix?:           React.ReactNode;
  caption?:          string;
  rightSlot?:        React.ReactNode;
}

function CaptionText({ text }: { text: string }) {
  const [expanded,    setExpanded]    = React.useState(false);
  const [sliceIndex,  setSliceIndex]  = React.useState<number | null>(null);
  const measureRef  = React.useRef<HTMLDivElement>(null);

  const LINE_HEIGHT   = 1.6;
  const FONT_SIZE     = 14;
  const LINES         = 3;
  const clampedHeight = LINE_HEIGHT * FONT_SIZE * LINES;

  const toHtml = (str: string) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(
        /(https?:\/\/[^\s]+)/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:#1D9BF0;text-decoration:none;word-break:break-all;">$1</a>'
      );

  React.useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    el.innerHTML = toHtml(text);
    if (el.scrollHeight <= clampedHeight + 2) {
      setSliceIndex(null);
      return;
    }
    let lo = 0, hi = text.length, best = 0;
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      el.innerHTML = toHtml(text.slice(0, mid)) + "... more";
      if (el.scrollHeight <= clampedHeight + 2) {
        best = mid;
        lo   = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    setSliceIndex(best);
  }, [text, clampedHeight]);

  const isClamped = sliceIndex !== null;

  return (
    <>
      <div
        ref={measureRef}
        aria-hidden
        style={{
          position:      "fixed",
          top:           "-9999px",
          left:          "-9999px",
          width:         "calc(100vw - 80px)",
          fontSize:      `${FONT_SIZE}px`,
          lineHeight:    LINE_HEIGHT,
          whiteSpace:    "pre-wrap",
          wordBreak:     "break-word",
          visibility:    "hidden",
          pointerEvents: "none",
        }}
      />
      <p style={{
        fontSize:   `${FONT_SIZE}px`,
        color:      "#FFFFFF",
        lineHeight: LINE_HEIGHT,
        margin:     "0",
        padding:    "0 16px 2px 5px",
        whiteSpace: "pre-wrap",
        wordBreak:  "break-word",
      }}>
        {!isClamped || expanded ? (
          <>
            <span dangerouslySetInnerHTML={{ __html: toHtml(text) }} />
            {isClamped && expanded && (
              <span
                onClick={() => setExpanded(false)}
                style={{ color: "#8B5CF6", cursor: "pointer", fontWeight: 500, fontSize: `${FONT_SIZE}px` }}
              >
                {" "}less
              </span>
            )}
          </>
        ) : (
          <>
            <span dangerouslySetInnerHTML={{ __html: toHtml(text.slice(0, sliceIndex).trimEnd()) }} />
            <span style={{ color: "#FFFFFF" }}>... </span>
            <span
              onClick={() => setExpanded(true)}
              style={{ color: "#8B5CF6", cursor: "pointer", fontWeight: 500, fontSize: `${FONT_SIZE}px` }}
            >
              more
            </span>
          </>
        )}
      </p>
    </>
  );
}

  
export default function PostHeader({
  avatarUrl,
  displayName,
  username,
  isVerified,
  timestamp,
  hasStory = false,
  hasUnviewedStory = false,
  onAvatarClick,
  onNameClick,
  suffix,
  rightSlot,
  caption,
}: PostHeaderProps) {

  return (
    <>
      <div style={{
        padding: "16px 16px 2px 5px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: "10px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
          <AvatarWithStoryRing
            src={avatarUrl}
            alt={displayName}
            size={48}
            hasStory={hasStory}
            hasUnviewed={hasUnviewedStory}
            onClick={onAvatarClick}
          />
          <div
            style={{ cursor: onNameClick ? "pointer" : "default", minWidth: 0 }}
            onClick={onNameClick}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{
                fontSize: "15px", fontWeight: 700, color: "#FFFFFF",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {displayName}
              </span>
              {isVerified && <BadgeCheck size={15} color="#8B5CF6" />}
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: "5px",
              fontSize: "13px", color: "#6B6B8A",
            }}>
              <span>@{username}</span>
              {suffix}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", flexShrink: 0 }}>
          <span style={{ fontSize: "12px", color: "#6B6B8A", whiteSpace: "nowrap" }}>{timestamp}</span>
          {rightSlot && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {rightSlot}
            </div>
          )}
        </div>
      </div>

      {caption && <CaptionText text={caption} />}
    </>
  );
}