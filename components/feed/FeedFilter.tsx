"use client";

interface FeedFilterProps {
  active: string;
  onChange: (val: string) => void;
}

const TABS = [
  { key: "all",    label: "All"      },
  { key: "free",   label: "Free"     },
  { key: "locked", label: "Locked"   },
];

export function FeedFilter({ active, onChange }: FeedFilterProps) {
  return (
    <div style={{
      display: "flex", gap: "8px",
      paddingBottom: "14px",
      overflowX: "auto", scrollbarWidth: "none",
    }}>
      {TABS.map((tab) => {
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            style={{
              padding: "6px 16px",
              borderRadius: "50px",
              border: `1.5px solid ${isActive ? "#8B5CF6" : "#2A2A3D"}`,
              backgroundColor: isActive ? "#8B5CF6" : "transparent",
              color: isActive ? "#fff" : "#6B6B8A",
              fontSize: "13px", fontWeight: isActive ? 700 : 500,
              cursor: "pointer", fontFamily: "'Inter', sans-serif",
              whiteSpace: "nowrap", flexShrink: 0,
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.borderColor = "#8B5CF6";
                e.currentTarget.style.color = "#8B5CF6";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.borderColor = "#2A2A3D";
                e.currentTarget.style.color = "#6B6B8A";
              }
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}