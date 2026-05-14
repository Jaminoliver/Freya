"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, UserCheck, MessagesSquare } from "lucide-react";

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
  messageLoading?: boolean;
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
  messageLoading = false,
}: ProfileActionsProps) {
  const router = useRouter();

  const handleEditProfile = () => {
    router.push("/settings/profile");
    onEditProfile?.();
  };

  const followBtnRef = useRef<HTMLButtonElement>(null);

const handleFollowClick = () => {
  const btn = followBtnRef.current;
  if (btn) {
    btn.style.animation = "none";
    void btn.offsetHeight;
    btn.style.animation = "bounceFollow 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards";
  }
  setTimeout(() => { onFollow?.(); }, 220);
};

const spinKeyframes = (
    <style>{`
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes bounceFollow { 0%{transform:scale(1)} 30%{transform:scale(0.88)} 65%{transform:scale(1.08)} 100%{transform:scale(1)} }
  @keyframes iconSwapIn { 0%{opacity:0;transform:scale(0.5) rotate(-15deg)} 100%{opacity:1;transform:scale(1) rotate(0deg)} }
`}</style>
  );

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
      <>
      {spinKeyframes}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "6px" }}>
        <button
          onClick={() => onMessage?.()}
          disabled={messageLoading}
          style={{
            display: "flex", alignItems: "center", gap: "5px",
            padding: "3px 10px", borderRadius: "999px",
            background: "transparent", border: "1px solid #3A3A4D",
            cursor: messageLoading ? "default" : "pointer",
            fontFamily: "'Inter', sans-serif",
            transition: "border-color 0.15s",
            opacity: messageLoading ? 0.6 : 1,
          }}
          onMouseEnter={(e) => { if (!messageLoading) e.currentTarget.style.borderColor = "#8B5CF6"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#3A3A4D"; }}
        >
          {messageLoading ? (
            <div style={{ width: "16px", height: "16px", borderRadius: "50%", border: "2px solid #C4C4D4", borderTopColor: "transparent", animation: "spin 0.6s linear infinite" }} />
          ) : (
            <MessagesSquare size={22} strokeWidth={1.8} color="#C4C4D4" />
          )}
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#C4C4D4" }}>Message</span>
        </button>
      </div>
      </>
    );
  }

  if (viewContext === "fanViewingCreator") {
    return (
      <>
      {spinKeyframes}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "6px" }}>
        {/* Following/Follow pill */}
        <button
          ref={followBtnRef}
          onClick={handleFollowClick}
          style={{
            display: "flex", alignItems: "center", gap: "5px",
            padding: "7px 14px", borderRadius: "999px",
            background: isFollowing ? "#8B5CF6" : "transparent",
            border: `1px solid ${isFollowing ? "#8B5CF6" : "#3A3A4D"}`,
            cursor: "pointer", fontFamily: "'Inter', sans-serif",
            transition: "background 0.22s ease, border-color 0.22s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#8B5CF6"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = isFollowing ? "#8B5CF6" : "#3A3A4D"; }}
        >
          {isFollowing
            ? <span key="check" style={{ display:"flex", animation:"iconSwapIn 0.22s cubic-bezier(0.34,1.56,0.64,1) forwards" }}><UserCheck size={16} strokeWidth={1.8} color="#FFFFFF" /></span>
            : <span key="plus"  style={{ display:"flex", animation:"iconSwapIn 0.22s cubic-bezier(0.34,1.56,0.64,1) forwards" }}><UserPlus  size={16} strokeWidth={1.8} color="#C4C4D4" /></span>
          }
          <span style={{ fontSize: "12px", fontWeight: 600, color: isFollowing ? "#FFFFFF" : "#C4C4D4" }}>
            {isFollowing ? "Following" : "Follow"}
          </span>
        </button>

        {/* Message — only when subscribed */}
        {isSubscribed && (
          <button
            onClick={() => onMessage?.()}
            disabled={messageLoading}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "transparent", border: "none",
              cursor: messageLoading ? "default" : "pointer",
              opacity: messageLoading ? 0.6 : 1,
              padding: 0,
            }}
          >
            {messageLoading ? (
              <div style={{ width: "18px", height: "18px", borderRadius: "50%", border: "2px solid #C4C4D4", borderTopColor: "transparent", animation: "spin 0.6s linear infinite" }} />
            ) : (
              <MessagesSquare size={22} strokeWidth={1.8} color="#C4C4D4" />
            )}
          </button>
        )}

        {/* Tip pill */}
        <button
          onClick={() => onTip?.(undefined)}
          style={{
            display: "flex", alignItems: "center",
            background: "none", border: "none",
            padding: 0, cursor: "pointer",
          }}
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
      </>
    );
  }

  return null;
}