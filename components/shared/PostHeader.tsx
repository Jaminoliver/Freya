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
  /** Optional inline suffix rendered after the timestamp (e.g. "· Free"). */
  suffix?:           React.ReactNode;
  /** Right-side content (Subscribe pill, ••• menu, PPV badge, etc). */
  rightSlot?:        React.ReactNode;
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
}: PostHeaderProps) {
  return (
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
              fontSize: "16px", fontWeight: 700, color: "#FFFFFF",
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
  );
}