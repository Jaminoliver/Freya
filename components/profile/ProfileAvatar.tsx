"use client";

import { Camera } from "lucide-react";

interface ProfileAvatarProps {
  avatarUrl?: string | null;
  displayName: string | null;
  isEditable?: boolean;
  isOnline?: boolean;
  onEditAvatar?: () => void;
}

export default function ProfileAvatar({
  avatarUrl,
  displayName,
  isEditable = false,
  isOnline = false,
  onEditAvatar,
}: ProfileAvatarProps) {
  const firstLetter = (displayName || "?").charAt(0).toUpperCase();

  const handleClick = () => {
    if (isEditable && onEditAvatar) {
      onEditAvatar();
    }
  };

  return (
    <div
      style={{
        position: "relative",
        width: "96px",
        height: "96px",
        marginTop: "-38px",
        marginLeft: "10px",
      }}
    >
      {/* Avatar Circle */}
      <div
        onClick={handleClick}
        style={{
          width: "96px",
          height: "96px",
          borderRadius: "50%",
          background: avatarUrl
            ? `url(${avatarUrl}) center/cover no-repeat`
            : "linear-gradient(135deg, #8B5CF6, #EC4899)",
          border: "3px solid #0A0A0F",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "36px",
          fontWeight: 700,
          color: "#FFFFFF",
          fontFamily: "'Inter', sans-serif",
          cursor: isEditable ? "pointer" : "default",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {!avatarUrl && firstLetter}

        {/* Edit Overlay */}
        {isEditable && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(10, 10, 15, 0.7)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
              opacity: avatarUrl ? 0 : 1,
              transition: "opacity 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = avatarUrl ? "0" : "1";
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                backgroundColor: "rgba(31, 31, 42, 0.8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Camera size={16} color="#A3A3C2" strokeWidth={1.8} />
            </div>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 500,
                color: "#A3A3C2",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              Add Photo
            </span>
          </div>
        )}
      </div>

      {/* Online Status Badge */}
      {isOnline && (
        <div
          style={{
            position: "absolute",
            bottom: "6px",
            right: "6px",
            width: "16px",
            height: "16px",
            borderRadius: "50%",
            backgroundColor: "#10B981",
            border: "2px solid #0A0A0F",
          }}
        />
      )}
    </div>
  );
}