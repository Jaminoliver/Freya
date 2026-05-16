// components/shared/PostHeader.tsx
"use client";

import * as React from "react";
// removed twemoji import
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
  /** Optional inline suffix rendered after the timestamp (e.g. "· Free"). */
  suffix?:           React.ReactNode;
  caption?:          string;
  /** Right-side content (Subscribe pill, ••• menu, PPV badge, etc). */
  rightSlot?:        React.ReactNode;
}

function CaptionText({ text }: { text: string }) {
  const html = React.useMemo(() => {
    const escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return escaped.replace(
      /(https?:\/\/[^\s]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:#1D9BF0;text-decoration:none;word-break:break-all;">$1</a>'
    );
  }, [text]);

  return (
    <p
      dangerouslySetInnerHTML={{ __html: html }}
      style={{ fontSize: "14px", color: "#FFFFFF", lineHeight: 1.6, margin: "0", padding: "0 16px 2px", whiteSpace: "pre-wrap" }}
    />
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
      padding: "16px 16px 10px",
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