import * as React from "react";
import { cn } from "@/lib/utils";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt: string;
  size?: AvatarSize;
  showOnlineStatus?: boolean;
  isOnline?: boolean;
  showEditButton?: boolean;
  onEditClick?: () => void;
  showRing?: boolean;
}

const sizeConfig = {
  xs:    { px: 24,  statusDot: 8,  editBtn: 16, ringPad: 2 },
  sm:    { px: 32,  statusDot: 10, editBtn: 18, ringPad: 2 },
  md:    { px: 40,  statusDot: 12, editBtn: 20, ringPad: 2 },
  lg:    { px: 56,  statusDot: 14, editBtn: 22, ringPad: 2.5 },
  xl:    { px: 80,  statusDot: 14, editBtn: 24, ringPad: 3 },
  "2xl": { px: 96,  statusDot: 16, editBtn: 26, ringPad: 3 },
};

const GRADIENT = "linear-gradient(to right, #8B5CF6, #EC4899)";

export function Avatar({
  src,
  alt,
  size = "md",
  showOnlineStatus = false,
  isOnline = false,
  showEditButton = false,
  onEditClick,
  showRing = true,
  className,
  ...props
}: AvatarProps) {
  const config = sizeConfig[size];

  const getInitials = (name: string) => {
    const names = name.split(" ");
    if (names.length >= 2) return `${names[0][0]}${names[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const totalSize = config.px + (showRing ? config.ringPad * 2 + 4 : 0);

  return (
    <div
      className={cn("relative inline-block flex-shrink-0", className)}
      style={{ width: totalSize, height: totalSize }}
      {...props}
    >
      {/* Gradient ring */}
      <div style={{
        width: "100%", height: "100%", borderRadius: "50%",
        background: showRing ? GRADIENT : "transparent",
        padding: showRing ? `${config.ringPad}px` : 0,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {/* Inner gap (card bg color) */}
        <div style={{
          width: "100%", height: "100%", borderRadius: "50%",
          background: showRing ? "#1C1C2E" : "transparent",
          padding: showRing ? "2px" : 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {/* Actual avatar */}
          <div style={{
            width: config.px, height: config.px,
            borderRadius: "50%", overflow: "hidden",
            background: GRADIENT,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            {src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt={alt}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <span style={{ color: "#fff", fontWeight: 600, fontSize: config.px * 0.35 }}>
                {getInitials(alt)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Online Status */}
      {showOnlineStatus && (
        <div style={{
          position: "absolute", bottom: 2, right: 2,
          width: config.statusDot, height: config.statusDot,
          borderRadius: "50%",
          backgroundColor: isOnline ? "#22c55e" : "#6B6B8A",
          border: "2px solid #0A0A0F",
        }} />
      )}

      {/* Edit Button */}
      {showEditButton && (
        <button
          onClick={onEditClick}
          aria-label="Edit avatar"
          style={{
            position: "absolute", bottom: 0, right: 0,
            width: config.editBtn, height: config.editBtn,
            borderRadius: "50%", backgroundColor: "#1F1F2A",
            border: "2px solid #0A0A0F",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <svg width={config.editBtn * 0.55} height={config.editBtn * 0.55} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ color: "#fff" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      )}
    </div>
  );
}