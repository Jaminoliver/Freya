"use client";

import { Star } from "lucide-react";
import { useNav } from "@/lib/hooks/useNav";
import { AvatarWithStoryRing } from "@/components/ui/AvatarWithStoryRing";
import { useCreatorStory } from "@/lib/hooks/useCreatorStory";
import { useState } from "react";
import StoryViewer from "@/components/story/StoryViewer";
import type { Subscription } from "@/lib/types/subscription";

export function FavouritesRail({
  favourites,
  onEdit,
}: {
  favourites: Subscription[];
  onEdit?:    () => void;
}) {
  if (favourites.length === 0) return null;

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 18px 10px",
      }}>
        <span style={{
          fontSize: "16px", fontWeight: 400, color: "#A3A3C2",
          letterSpacing: "0", textTransform: "none",
          display: "flex", alignItems: "center", gap: "6px",
        }}>
          <Star size={16} fill="#F59E0B" color="#F59E0B" strokeWidth={0} />
          Favourites
        </span>
        {onEdit && (
          <button
            onClick={onEdit}
            style={{
              fontSize: "11px", color: "#8B5CF6", fontWeight: 500,
              background: "none", border: "none", cursor: "pointer",
              padding: "4px 2px", fontFamily: "inherit",
            }}
          >
            Edit
          </button>
        )}
      </div>

      <div style={{
        display: "flex", gap: "12px",
        overflowX: "auto", scrollbarWidth: "none",
        padding: "0 18px 4px",
      }}>
        {favourites.map((s) => (
          <FavouriteBubble key={s.id} subscription={s} />
        ))}
      </div>
    </div>
  );
}

function FavouriteBubble({ subscription: s }: { subscription: Subscription }) {
  const { navigate } = useNav();
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);

  const { group: storyGroup, hasStory, hasUnviewed, refresh } = useCreatorStory(s.creatorId);

  const handleClick = () => {
    if (hasStory && storyGroup) setStoryViewerOpen(true);
    else                        navigate(`/${s.username}`);
  };

  const firstName = s.creatorName.split(" ")[0] ?? s.username;

  return (
    <>
      {storyViewerOpen && storyGroup && (
        <StoryViewer
          groups={[storyGroup]}
          startGroupIndex={0}
          onClose={() => { setStoryViewerOpen(false); refresh(); }}
        />
      )}

      <button
        onClick={handleClick}
        style={{
          flexShrink: 0, background: "none", border: "none", cursor: "pointer",
          padding: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", gap: "6px",
          width: "72px",
          fontFamily: "inherit",
        }}
      >
        <AvatarWithStoryRing
          src={s.avatar_url}
          alt={s.creatorName}
          size={64}
          hasStory={hasStory}
          hasUnviewed={hasUnviewed}
          onClick={() => {}}
          borderColor="#0A0A0F"
        />
        <span style={{
          fontSize: "16px", color: "#F1F5F9", fontWeight: 700,
          maxWidth: "72px",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {firstName}
        </span>
      </button>
    </>
  );
}