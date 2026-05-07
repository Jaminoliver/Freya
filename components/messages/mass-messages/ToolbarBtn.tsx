"use client";

interface ToolbarBtnProps {
  icon:    React.ReactNode;
  active:  boolean;
  label?:  string;
  onClick: () => void;
}

export function ToolbarBtn({ icon, active, label, onClick }: ToolbarBtnProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display:         "flex",
        alignItems:      "center",
        gap:             "4px",
        padding:         "9px 12px",
        borderRadius:    "10px",
        border:          "none",
        backgroundColor: active ? "rgba(139,92,246,0.14)" : "transparent",
        color:           active ? "#8B5CF6" : "#A3A3C2",
        cursor:          "pointer",
        transition:      "all 0.15s ease",
        fontFamily:      "'Inter', sans-serif",
        fontSize:        "13px",
        fontWeight:      600,
      }}
    >
      {icon}
      {label && <span>{label}</span>}
    </button>
  );
}