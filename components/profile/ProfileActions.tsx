"use client";

import { MessageCircle, Banknote, Share2, UserPlus, UserCheck } from "lucide-react";

interface ProfileActionsProps {
  viewContext: "ownFan" | "ownCreator" | "creatorViewingFan" | "fanViewingCreator";
  onEditProfile?: () => void;
  onMessage?: () => void;
  onTip?: () => void;
  onShare?: () => void;
  onFollow?: () => void;
  isFollowing?: boolean;
}

export default function ProfileActions({
  viewContext,
  onEditProfile,
  onMessage,
  onTip,
  onShare,
  onFollow,
  isFollowing = false,
}: ProfileActionsProps) {

  if (viewContext === "ownFan") {
    return (
      <button onClick={onEditProfile} style={{ padding: "5px 12px", borderRadius: "6px", backgroundColor: "transparent", border: "1px solid #8B5CF6", color: "#8B5CF6", fontSize: "12px", fontWeight: 600, fontFamily: "'Inter', sans-serif", cursor: "pointer", transition: "background-color 0.2s ease, color 0.2s ease" }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#8B5CF6"; e.currentTarget.style.color = "#FFFFFF"; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#8B5CF6"; }}>
        Edit Profile
      </button>
    );
  }

  if (viewContext === "ownCreator") {
    return (
      <button onClick={onEditProfile} style={{ padding: "5px 12px", borderRadius: "6px", backgroundColor: "transparent", border: "1px solid #8B5CF6", color: "#8B5CF6", fontSize: "12px", fontWeight: 600, fontFamily: "'Inter', sans-serif", cursor: "pointer", transition: "background-color 0.2s ease, color 0.2s ease" }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#8B5CF6"; e.currentTarget.style.color = "#FFFFFF"; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#8B5CF6"; }}>
        Edit Profile
      </button>
    );
  }

  if (viewContext === "creatorViewingFan") {
    return (
      <div style={{ position: "absolute", top: "24px", right: "24px" }}>
        <button onClick={onMessage} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "5px 12px", borderRadius: "6px", backgroundColor: "#8B5CF6", border: "none", color: "#FFFFFF", fontSize: "12px", fontWeight: 600, fontFamily: "'Inter', sans-serif", cursor: "pointer", transition: "background-color 0.2s ease" }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#7C3AED"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#8B5CF6"; }}>
          <MessageCircle size={16} strokeWidth={2} />
          Message
        </button>
      </div>
    );
  }

  if (viewContext === "fanViewingCreator") {
    const iconBtn: React.CSSProperties = {
      display: "flex", alignItems: "center", justifyContent: "center",
      width: "44px", height: "44px", borderRadius: "10px",
      backgroundColor: "#1E1E2E", border: "1px solid #2A2A3D",
      color: "#A3A3C2", cursor: "pointer", transition: "all 0.15s ease",
    };

    return (
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>

        {/* Follow / Following */}
        <button
          onClick={onFollow}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "0 14px", height: "44px", borderRadius: "10px",
            backgroundColor: isFollowing ? "#1E1E2E" : "#8B5CF6",
            border: isFollowing ? "1px solid #8B5CF6" : "none",
            color: isFollowing ? "#8B5CF6" : "#fff",
            fontSize: "13px", fontWeight: 600,
            fontFamily: "'Inter', sans-serif", cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            if (isFollowing) { e.currentTarget.style.backgroundColor = "rgba(139,92,246,0.15)"; }
            else { e.currentTarget.style.backgroundColor = "#7C3AED"; }
          }}
          onMouseLeave={(e) => {
            if (isFollowing) { e.currentTarget.style.backgroundColor = "#1E1E2E"; }
            else { e.currentTarget.style.backgroundColor = "#8B5CF6"; }
          }}
        >
          {isFollowing ? <UserCheck size={17} strokeWidth={1.8} /> : <UserPlus size={17} strokeWidth={1.8} />}
          {isFollowing ? "Following" : "Follow"}
        </button>

        {/* Message */}
        <button onClick={onMessage} style={iconBtn} title="Message"
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(139,92,246,0.15)"; e.currentTarget.style.borderColor = "#8B5CF6"; e.currentTarget.style.color = "#8B5CF6"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#1E1E2E"; e.currentTarget.style.borderColor = "#2A2A3D"; e.currentTarget.style.color = "#A3A3C2"; }}>
          <MessageCircle size={20} strokeWidth={1.8} />
        </button>

        {/* Tip */}
        <button onClick={onTip} style={iconBtn} title="Send Tip"
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(236,72,153,0.15)"; e.currentTarget.style.borderColor = "#EC4899"; e.currentTarget.style.color = "#EC4899"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#1E1E2E"; e.currentTarget.style.borderColor = "#2A2A3D"; e.currentTarget.style.color = "#A3A3C2"; }}>
          <Banknote size={20} strokeWidth={1.8} />
        </button>

        {/* Share */}
        <button onClick={onShare} style={iconBtn} title="Share"
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(139,92,246,0.15)"; e.currentTarget.style.borderColor = "#8B5CF6"; e.currentTarget.style.color = "#8B5CF6"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#1E1E2E"; e.currentTarget.style.borderColor = "#2A2A3D"; e.currentTarget.style.color = "#A3A3C2"; }}>
          <Share2 size={20} strokeWidth={1.8} />
        </button>

      </div>
    );
  }

  return null;
}