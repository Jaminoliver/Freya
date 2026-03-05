"use client";

export function Avatar({ src, name, size = 36 }: { src?: string | null; name: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, backgroundColor: "#2A2A3D", overflow: "hidden", border: "1.5px solid #1E1E2E" }}>
      {src
        ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: size * 0.38, fontWeight: 700, color: "#8B5CF6" }}>{name.charAt(0).toUpperCase()}</span>
          </div>
      }
    </div>
  );
}