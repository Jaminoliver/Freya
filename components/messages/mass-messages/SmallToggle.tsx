"use client";

interface SmallToggleProps {
  on: boolean;
  onToggle: () => void;
}

export function SmallToggle({ on, onToggle }: SmallToggleProps) {
  return (
    <div
      onClick={onToggle}
      style={{
        width:      "40px",
        height:     "24px",
        borderRadius: "12px",
        background: on ? "#8B5CF6" : "#2A2A3D",
        cursor:     "pointer",
        position:   "relative",
        transition: "background 0.2s",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position:     "absolute",
          top:          "3px",
          left:         on ? "19px" : "3px",
          width:        "18px",
          height:       "18px",
          borderRadius: "50%",
          background:   "#FFF",
          transition:   "left 0.2s",
          boxShadow:    "0 1px 3px rgba(0,0,0,0.4)",
        }}
      />
    </div>
  );
}