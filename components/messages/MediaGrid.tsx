"use client";

import { Lock } from "lucide-react";

interface Props {
  mediaUrls:   string[];
  isPPV?:      boolean;
  price?:      number;
  isUnlocked?: boolean;
  onUnlock?:   () => void;
}

export function MediaGrid({ mediaUrls, isPPV, price, isUnlocked }: Props) {
  const count  = mediaUrls.length;
  const extra  = count > 4 ? count - 4 : 0;
  const locked = isPPV && !isUnlocked;

  const getGridStyle = (): React.CSSProperties => {
    if (count === 1) return { display: "block" };
    return { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px" };
  };

  const getItemHeight = () => (count === 1 ? "200px" : "120px");

  const getGridColumn = (i: number) =>
    count === 3 && i === 2 ? "1" : "auto";

  return (
    <div style={{ position: "relative", borderRadius: "12px 12px 0 0", overflow: "hidden" }}>
      <div style={getGridStyle()}>
        {mediaUrls.slice(0, 4).map((url, i) => (
          <div
            key={i}
            style={{
              position:        "relative",
              overflow:        "hidden",
              height:          getItemHeight(),
              backgroundColor: "#2A2A3D",
              gridColumn:      getGridColumn(i),
            }}
          >
            <img
              src={url}
              alt=""
              style={{
                width:     "100%",
                height:    "100%",
                objectFit: "cover",
                display:   "block",
                filter:    locked ? "blur(12px)" : "none",
                transform: locked ? "scale(1.1)" : "scale(1)",
                transition:"filter 0.3s ease",
              }}
            />
            {locked && <div style={{ position:"absolute", inset:0, backgroundColor:"rgba(0,0,0,0.55)" }} />}
            {extra > 0 && i === 3 && (
              <div style={{ position:"absolute", inset:0, backgroundColor:"rgba(0,0,0,0.65)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ color:"#FFFFFF", fontSize:"18px", fontWeight:700, fontFamily:"'Inter',sans-serif" }}>+{extra} more</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {locked && (
        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"6px", pointerEvents:"none" }}>
          <Lock size={28} color="#FFFFFF" strokeWidth={1.8} />
          <span style={{ fontSize:"11px", fontWeight:600, color:"#FFFFFF", fontFamily:"'Inter',sans-serif", letterSpacing:"0.06em" }}>PPV</span>
        </div>
      )}

      {locked && price && (
        <div style={{ position:"absolute", bottom:"10px", left:"10px", backgroundColor:"#F5A623", color:"#0A0A0F", fontSize:"12px", fontWeight:700, padding:"3px 8px", borderRadius:"8px", fontFamily:"'Inter',sans-serif" }}>
          ₦{price.toLocaleString()}
        </div>
      )}
    </div>
  );
}