"use client";

export interface SavedCard {
  id: string;
  last_four: string;
  card_type: string;
  expiry: string;
  is_default: boolean;
}

interface CardsTabProps {
  cards: SavedCard[];
  onAddCard: () => void;
  onSetDefault: (id: string) => void;
  onRemoveCard: (id: string) => void;
}

export default function CardsTab({ cards, onAddCard, onSetDefault, onRemoveCard }: CardsTabProps) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <p style={{ fontSize: "10px", fontWeight: 600, color: "#6B6B8A", letterSpacing: "0.08em", textTransform: "uppercase", margin: 0, fontFamily: "'Inter', sans-serif" }}>
          Payment Cards
        </p>
        <button
          onClick={onAddCard}
          style={{
            display: "flex", alignItems: "center", gap: "4px",
            padding: "5px 12px", borderRadius: "6px",
            border: "1.5px solid #8B5CF6", backgroundColor: "transparent",
            color: "#8B5CF6", fontSize: "12px", fontWeight: 600,
            cursor: "pointer", fontFamily: "'Inter', sans-serif", transition: "background-color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(139,92,246,0.1)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <span style={{ fontSize: "14px", lineHeight: 1 }}>+</span>
          Add Card
        </button>
      </div>

      {cards.length === 0 ? (
        <div style={{ backgroundColor: "#1C1C2E", border: "1.5px dashed #2A2A3D", borderRadius: "10px", padding: "28px 16px", textAlign: "center" }}>
          <div style={{ fontSize: "22px", marginBottom: "8px" }}>💳</div>
          <p style={{ fontSize: "13px", color: "#6B6B8A", margin: 0, fontFamily: "'Inter', sans-serif" }}>No saved cards yet</p>
          <p style={{ fontSize: "11px", color: "#6B6B8A", margin: "3px 0 0", fontFamily: "'Inter', sans-serif" }}>Add a card to top up instantly</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {cards.map((card) => (
            <div
              key={card.id}
              style={{
                backgroundColor: "#1C1C2E",
                border: `1.5px solid ${card.is_default ? "#8B5CF6" : "#2A2A3D"}`,
                borderRadius: "10px", padding: "12px 14px",
                display: "flex", alignItems: "center", gap: "10px",
                boxShadow: card.is_default ? "0 0 0 1px rgba(139,92,246,0.2)" : "none",
              }}
            >
              {/* Card icon */}
              <div style={{ width: "32px", height: "22px", borderRadius: "4px", backgroundColor: "#2A2A3D", border: "1px solid #8B5CF6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="16" height="11" viewBox="0 0 24 16" fill="none">
                  <rect width="24" height="16" rx="2" fill="#2A2A3D" />
                  <path d="M0 5h24" stroke="#8B5CF6" strokeWidth="2.5" />
                </svg>
              </div>

              {/* Card info */}
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "#F1F5F9", margin: "0 0 1px", fontFamily: "'Inter', sans-serif" }}>
                  •••• •••• •••• {card.last_four}
                </p>
                <p style={{ fontSize: "11px", color: "#6B6B8A", margin: 0, fontFamily: "'Inter', sans-serif" }}>
                  Expires {card.expiry}
                </p>
              </div>

              {card.is_default && (
                <span style={{ fontSize: "10px", fontWeight: 600, color: "#8B5CF6", border: "1.5px solid #8B5CF6", borderRadius: "50px", padding: "2px 8px", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap" }}>
                  Default
                </span>
              )}

              <button style={{ background: "none", border: "none", color: "#6B6B8A", cursor: "pointer", padding: "2px 4px", fontSize: "16px", lineHeight: 1 }}>
                ⋯
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Statement notice */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: "#1C1C2E", border: "1.5px solid #2A2A3D", borderRadius: "8px", padding: "10px 12px", marginTop: "12px" }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6B6B8A" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span style={{ fontSize: "11px", color: "#6B6B8A", fontFamily: "'Inter', sans-serif" }}>
          Charges on your statement will appear as &apos;Freya Credits&apos;
        </span>
      </div>
    </div>
  );
}