const blobs = [
  { width: 120, height: 80, left: 60, top: 5, opacity: 0.4 },
  { width: 90, height: 140, left: 20, top: 15, opacity: 0.3 },
  { width: 150, height: 100, left: 75, top: 25, opacity: 0.35 },
  { width: 80, height: 80, left: 10, top: 40, opacity: 0.3 },
  { width: 110, height: 130, left: 55, top: 50, opacity: 0.4 },
  { width: 100, height: 90, left: 30, top: 65, opacity: 0.35 },
  { width: 140, height: 80, left: 70, top: 72, opacity: 0.3 },
  { width: 90, height: 110, left: 5, top: 80, opacity: 0.4 },
  { width: 120, height: 90, left: 45, top: 88, opacity: 0.35 },
  { width: 80, height: 120, left: 80, top: 92, opacity: 0.3 },
];

export interface AuthBrandingPanelProps {
  heading: string;
  subtext: string;
  gradient?: boolean;
}

export function AuthBrandingPanel({ heading, subtext, gradient = true }: AuthBrandingPanelProps) {
  return (
    <div
      className="hidden md:flex"
      style={{
        width: "50%",
        position: "relative",
        overflow: "hidden",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "48px",
        backgroundColor: "#141420",
        flexShrink: 0,
      }}
    >
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {blobs.map((blob, i) => (
          <div key={i} style={{ position: "absolute", borderRadius: "50%", backgroundColor: "#2A2A3D", width: `${blob.width}px`, height: `${blob.height}px`, left: `${blob.left}%`, top: `${blob.top}%`, opacity: blob.opacity }} />
        ))}
      </div>

      <div style={{ position: "relative", zIndex: 10 }}>
        <h1 style={{ fontSize: "36px", fontWeight: 700, color: "#8B5CF6", margin: 0 }}>Freya</h1>
      </div>

      <div style={{ position: "relative", zIndex: 10, maxWidth: "480px" }}>
        <h2
          style={{
            fontSize: "56px",
            fontWeight: 700,
            lineHeight: 1.1,
            marginBottom: "24px",
            ...(gradient ? {
              backgroundImage: "linear-gradient(to right, #8B5CF6, #EC4899)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            } : { color: "#F1F5F9" }),
          }}
        >
          {heading}
        </h2>
        <p style={{ fontSize: "18px", color: "#A3A3C2", margin: 0 }}>{subtext}</p>
      </div>

      <div />
    </div>
  );
}