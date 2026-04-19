"use client";

import { useRouter } from "next/navigation";
import { UserPlus, UserCheck } from "lucide-react";

interface ProfileActionsProps {
  viewContext:    "ownFan" | "ownCreator" | "creatorViewingFan" | "fanViewingCreator";
  targetUserId?:  string;
  isSubscribed?:  boolean;
  onEditProfile?: () => void;
  onMessage?:     () => void;
  onTip?:         (postId?: string) => void;
  onShare?:       () => void;
  onFollow?:      () => void;
  isFollowing?:   boolean;
}

export default function ProfileActions({
  viewContext,
  targetUserId,
  isSubscribed = false,
  onEditProfile,
  onMessage,
  onTip,
  onFollow,
  isFollowing = false,
}: ProfileActionsProps) {
  const router = useRouter();

  const handleEditProfile = () => {
    router.push("/settings/profile");
    onEditProfile?.();
  };

  if (viewContext === "ownFan" || viewContext === "ownCreator") {
    return (
      <button
        onClick={handleEditProfile}
        style={{
          padding: "5px 12px", borderRadius: "6px",
          backgroundColor: "transparent", border: "1px solid #8B5CF6",
          color: "#8B5CF6", fontSize: "12px", fontWeight: 600,
          fontFamily: "'Inter', sans-serif", cursor: "pointer",
          transition: "background-color 0.2s ease, color 0.2s ease",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#8B5CF6"; e.currentTarget.style.color = "#FFFFFF"; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#8B5CF6"; }}
      >
        Edit Profile
      </button>
    );
  }

  if (viewContext === "creatorViewingFan") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
        <button
          onClick={() => onMessage?.()}
          style={{
            display: "flex", alignItems: "center", gap: "7px",
            padding: "9px 18px", borderRadius: "999px",
            background: "transparent", border: "1px solid #3A3A4D",
            cursor: "pointer", fontFamily: "'Inter', sans-serif",
            transition: "border-color 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#8B5CF6"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#3A3A4D"; }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C4C4D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#C4C4D4" }}>Message</span>
        </button>
      </div>
    );
  }

  if (viewContext === "fanViewingCreator") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>

        {/* Following/Follow pill */}
        <button
          onClick={onFollow}
          style={{
            display: "flex", alignItems: "center", gap: "7px",
            padding: "9px 18px", borderRadius: "999px",
            background: "transparent",
            border: `1px solid ${isFollowing ? "#8B5CF6" : "#3A3A4D"}`,
            cursor: "pointer", fontFamily: "'Inter', sans-serif",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#8B5CF6"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = isFollowing ? "#8B5CF6" : "#3A3A4D"; }}
        >
          {isFollowing
            ? <UserCheck size={22} strokeWidth={1.8} color="#8B5CF6" />
            : <UserPlus  size={22} strokeWidth={1.8} color="#C4C4D4" />
          }
          <span style={{ fontSize: "13px", fontWeight: 600, color: isFollowing ? "#8B5CF6" : "#C4C4D4" }}>
            {isFollowing ? "Following" : "Follow"}
          </span>
        </button>

        {/* Message — only when subscribed */}
        {isSubscribed && (
          <button
            onClick={() => onMessage?.()}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: "44px", height: "44px", borderRadius: "999px",
              background: "transparent", border: "1px solid #3A3A4D",
              cursor: "pointer", transition: "border-color 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#8B5CF6"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#3A3A4D"; }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C4C4D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </button>
        )}

        {/* Tip pill */}
        <button
          onClick={() => onTip?.(undefined)}
          style={{
            display: "flex", alignItems: "center",
            background: "none", border: "1px solid #3A3A4D",
            padding: "9px 16px", borderRadius: "999px",
            cursor: "pointer", transition: "border-color 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#8B5CF6"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#3A3A4D"; }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C4C4D4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 12 20 22 4 22 4 12"/>
            <rect x="2" y="7" width="20" height="5"/>
            <line x1="12" y1="22" x2="12" y2="7"/>
            <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
            <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
          </svg>
        </button>

      </div>
    );
  }

  return null;
}