"use client";

interface Props {
  active:   string;
  counts:   Record<string, number>;
  onChange: (val: string) => void;
}

const TABS = [
  { key: "all",       label: "All"        },
  { key: "active",    label: "Active"     },
  { key: "expired",   label: "Expired"    },
  { key: "attention", label: "Attention"  },
  { key: "starred",   label: "★ Starred"  },
];

export function SubscriptionFilterTabs({ active, counts, onChange }: Props) {
  return (
    <div style={{
      display: "flex", gap: "8px",
      overflowX: "auto", scrollbarWidth: "none",
      padding: "0 18px 2px",
    }}>
      {TABS.map((t) => {
        const isActive = active === t.key;
        const count    = counts[t.key] ?? 0;

        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            style={{
              padding:         "7px 16px",
              borderRadius:    "20px",
              border:          "none",
              backgroundColor: isActive ? "#FFFFFF" : "#1A1A2A",
              color:           isActive ? "#0A0A0F" : "#94A3B8",
              fontSize:        "12px",
              fontWeight:      isActive ? 600 : 500,
              cursor:          "pointer",
              fontFamily:      "'Inter', sans-serif",
              whiteSpace:      "nowrap",
              flexShrink:      0,
              transition:      "all 0.15s",
            }}
          >
            {t.label}{count > 0 ? ` ${count}` : ""}
          </button>
        );
      })}
    </div>
  );
}