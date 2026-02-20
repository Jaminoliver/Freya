"use client";

import * as React from "react";
import { MessageCircle, Heart, Share2 } from "lucide-react";

interface ProfileActionsProps {
  viewContext: "ownFan" | "ownCreator" | "creatorViewingFan" | "fanViewingCreator";
  onEditProfile?: () => void;
  onMessage?: () => void;
  onTip?: () => void;
  onShare?: () => void;
}

export default function ProfileActions({
  viewContext,
  onEditProfile,
  onMessage,
  onTip,
  onShare,
}: ProfileActionsProps) {

  // Fan viewing own profile
  if (viewContext === "ownFan") {
    return (
      <button
        onClick={onEditProfile}
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

  // Creator viewing own profile
  if (viewContext === "ownCreator") {
    return (
      <button
        onClick={onEditProfile}
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

  // Creator viewing fan profile
  if (viewContext === "creatorViewingFan") {
    return (
      <div style={{ position: "absolute", top: "24px", right: "24px" }}>
        <button
          onClick={onMessage}
          style={{
            display: "flex", alignItems: "center", gap: "8px",
            padding: "5px 12px", borderRadius: "6px",
            backgroundColor: "#8B5CF6", border: "none",
            color: "#FFFFFF", fontSize: "12px", fontWeight: 600,
            fontFamily: "'Inter', sans-serif", cursor: "pointer",
            transition: "background-color 0.2s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#7C3AED"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#8B5CF6"; }}
        >
          <MessageCircle size={16} strokeWidth={2} />
          Message
        </button>
      </div>
    );
  }

  // Fan viewing creator profile (subscribed or not)
  if (viewContext === "fanViewingCreator") {
    const pillBase: React.CSSProperties = {
      display: "flex", alignItems: "center", gap: "7px",
      padding: "9px 18px", borderRadius: "999px",
      backgroundColor: "#1E1E2E", border: "1px solid #2A2A3D",
      color: "#D1D5DB", fontSize: "14px", fontWeight: 600,
      fontFamily: "'Inter', sans-serif", cursor: "pointer",
      transition: "all 0.15s ease",
    };

    return (
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>

        {/* Message */}
        <button
          onClick={onMessage}
          style={pillBase}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(139,92,246,0.15)"; e.currentTarget.style.borderColor = "#8B5CF6"; e.currentTarget.style.color = "#8B5CF6"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#1E1E2E"; e.currentTarget.style.borderColor = "#2A2A3D"; e.currentTarget.style.color = "#D1D5DB"; }}
        >
          <MessageCircle size={16} strokeWidth={1.8} />
          Message
        </button>

        {/* Tip */}
        <button
          onClick={onTip}
          style={pillBase}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(236,72,153,0.15)"; e.currentTarget.style.borderColor = "#EC4899"; e.currentTarget.style.color = "#EC4899"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#1E1E2E"; e.currentTarget.style.borderColor = "#2A2A3D"; e.currentTarget.style.color = "#D1D5DB"; }}
        >
          <Heart size={16} strokeWidth={1.8} />
          Tip
        </button>

        {/* Share */}
        <button
          onClick={onShare}
          style={pillBase}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(139,92,246,0.15)"; e.currentTarget.style.borderColor = "#8B5CF6"; e.currentTarget.style.color = "#8B5CF6"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#1E1E2E"; e.currentTarget.style.borderColor = "#2A2A3D"; e.currentTarget.style.color = "#D1D5DB"; }}
        >
          <Share2 size={16} strokeWidth={1.8} />
          Share
        </button>

      </div>
    );
  }

  return null;
}