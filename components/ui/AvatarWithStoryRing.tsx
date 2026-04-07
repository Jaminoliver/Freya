"use client";

interface AvatarWithStoryRingProps {
  src:         string | null | undefined;
  alt:         string;
  size:        number;
  hasStory:    boolean;
  hasUnviewed: boolean;
  onClick:     (e: React.MouseEvent) => void;
  borderColor?: string;
}

export function AvatarWithStoryRing({
  src, alt, size, hasStory, hasUnviewed, onClick, borderColor = "#0A0A0F",
}: AvatarWithStoryRingProps) {
  const gap     = 2;
  const border  = 3;
  const total   = size + (gap + border) * 2;

  const initial = alt?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <>
      <style>{``}</style>

      <div
        onClick={onClick}
        style={{
          width:    total,
          height:   total,
          borderRadius: "50%",
          position: "relative",
          cursor:   "pointer",
          flexShrink: 0,
        }}
      >
        {hasStory && hasUnviewed && (
          <div
            style={{
              position:     "absolute",
              inset:        0,
              borderRadius: "50%",
              background:   "conic-gradient(from 0deg, #EC4899, #8B5CF6, #06B6D4, #8B5CF6, #EC4899)",
              zIndex:       0,
            }}
          />
        )}

        {hasStory && !hasUnviewed && (
          <div
            style={{
              position:     "absolute",
              inset:        0,
              borderRadius: "50%",
              background:   "#4A4A6A",
              zIndex:       0,
            }}
          />
        )}

        <div
          style={{
            position:     "absolute",
            inset:        border,
            borderRadius: "50%",
            background:   borderColor,
            zIndex:       1,
          }}
        />

        <div
          style={{
            position:     "absolute",
            inset:        border + gap,
            borderRadius: "50%",
            overflow:     "hidden",
            background:   "linear-gradient(135deg, #8B5CF6, #EC4899)",
            zIndex:       2,
            display:      "flex",
            alignItems:   "center",
            justifyContent: "center",
          }}
        >
          {src ? (
            <img
              src={src}
              alt={alt}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : (
            <span style={{ color: "#fff", fontWeight: 700, fontSize: size * 0.35, fontFamily: "'Inter', sans-serif" }}>
              {initial}
            </span>
          )}
        </div>
      </div>
    </>
  );
}