"use client";

import { Lock, Calendar } from "lucide-react";

interface PostSettingsProps {
  audience: "subscribers" | "everyone";
  onAudienceChange: (v: "subscribers" | "everyone") => void;
  isPPV: boolean;
  onPPVChange: (v: boolean) => void;
  ppvPrice: string;
  onPPVPriceChange: (v: string) => void;
  isScheduled: boolean;
  onScheduledChange: (v: boolean) => void;
  schedDate: string;
  onSchedDateChange: (v: string) => void;
  schedTime: string;
  onSchedTimeChange: (v: string) => void;
  onCancel: () => void;
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      style={{
        width: "42px", height: "24px",
        borderRadius: "12px",
        backgroundColor: on ? "#8B5CF6" : "#2A2A3D",
        cursor: "pointer",
        position: "relative",
        transition: "background 0.2s",
        flexShrink: 0,
      }}
    >
      <div style={{
        position: "absolute",
        top: "3px",
        left: on ? "21px" : "3px",
        width: "18px", height: "18px",
        borderRadius: "50%",
        backgroundColor: "#fff",
        transition: "left 0.2s",
        boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
      }} />
    </div>
  );
}

export function PostSettings({
  audience, onAudienceChange,
  isPPV, onPPVChange,
  ppvPrice, onPPVPriceChange,
  isScheduled, onScheduledChange,
  schedDate, onSchedDateChange,
  schedTime, onSchedTimeChange,
  onCancel,
}: PostSettingsProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>

      {/* Single settings card */}
      <div style={{
        backgroundColor: "#0D0D18",
        border: "1.5px solid #2A2A3D",
        borderRadius: "14px",
        overflow: "hidden",
      }}>

        {/* Who can see this */}
        <div style={{
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #2A2A3D",
        }}>
          <span style={{ fontSize: "14px", color: "#C4C4D4", fontWeight: 500 }}>Who can see this?</span>
          <div style={{
            display: "flex",
            backgroundColor: "#1A1A2E",
            borderRadius: "10px",
            padding: "3px",
            gap: "2px",
          }}>
            {(["subscribers", "everyone"] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => onAudienceChange(opt)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: audience === opt ? "#8B5CF6" : "transparent",
                  color: audience === opt ? "#fff" : "#8A8AA0",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                  transition: "all 0.15s",
                }}
              >
                {opt === "subscribers" ? "Subscribers only" : "Everyone"}
              </button>
            ))}
          </div>
        </div>

        {/* Pay-Per-View */}
        <div style={{ borderBottom: "1px solid #2A2A3D" }}>
          <div style={{
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Lock size={16} color="#8A8AA0" strokeWidth={1.5} />
              <div>
                <div style={{ fontSize: "14px", fontWeight: 500, color: "#C4C4D4" }}>Set as Pay-Per-View</div>
                <div style={{ fontSize: "11px", color: "#6B6B8A", marginTop: "2px" }}>Fans pay once to unlock</div>
              </div>
            </div>
            <Toggle on={isPPV} onToggle={() => onPPVChange(!isPPV)} />
          </div>

          {isPPV && (
            <div style={{
              padding: "0 16px 14px",
              paddingTop: "0",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                flex: 1,
                backgroundColor: "#1A1A2E",
                border: "1px solid #2A2A3D",
                borderRadius: "8px",
                padding: "8px 12px",
              }}>
                <span style={{ color: "#8A8AA0", fontSize: "14px" }}>$</span>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={ppvPrice}
                  onChange={(e) => onPPVPriceChange(e.target.value)}
                  placeholder="Price"
                  style={{
                    flex: 1,
                    backgroundColor: "transparent",
                    border: "none",
                    outline: "none",
                    color: "#E2E8F0",
                    fontSize: "14px",
                    fontFamily: "'Inter', sans-serif",
                    caretColor: "#8B5CF6",
                  }}
                />
              </div>
              <span style={{ fontSize: "12px", color: "#6B6B8A", flexShrink: 0 }}>Max $50</span>
            </div>
          )}
        </div>

        {/* Schedule post */}
        <div>
          <div style={{
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Calendar size={16} color="#8A8AA0" strokeWidth={1.5} />
              <div>
                <div style={{ fontSize: "14px", fontWeight: 500, color: "#C4C4D4" }}>Schedule post</div>
                <div style={{ fontSize: "11px", color: "#6B6B8A", marginTop: "2px" }}>Set a future publish date & time</div>
              </div>
            </div>
            <Toggle on={isScheduled} onToggle={() => onScheduledChange(!isScheduled)} />
          </div>

          {isScheduled && (
            <div style={{
              padding: "0 16px 14px",
              display: "flex",
              gap: "10px",
            }}>
              <input
                type="date"
                value={schedDate}
                onChange={(e) => onSchedDateChange(e.target.value)}
                style={{
                  flex: 1,
                  backgroundColor: "#1A1A2E",
                  border: "1px solid #2A2A3D",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  color: "#E2E8F0",
                  fontSize: "13px",
                  fontFamily: "'Inter', sans-serif",
                  outline: "none",
                  colorScheme: "dark",
                }}
              />
              <input
                type="time"
                value={schedTime}
                onChange={(e) => onSchedTimeChange(e.target.value)}
                style={{
                  flex: 1,
                  backgroundColor: "#1A1A2E",
                  border: "1px solid #2A2A3D",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  color: "#E2E8F0",
                  fontSize: "13px",
                  fontFamily: "'Inter', sans-serif",
                  outline: "none",
                  colorScheme: "dark",
                }}
              />
            </div>
          )}
        </div>

      </div>

      {/* Cancel / Post */}
      <div style={{ display: "flex", gap: "10px", paddingTop: "4px", paddingBottom: "24px" }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1,
            padding: "12px",
            borderRadius: "12px",
            border: "1.5px solid #2A2A3D",
            backgroundColor: "transparent",
            color: "#A3A3C2",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#4A4A6A";
            (e.currentTarget as HTMLButtonElement).style.color = "#E2E8F0";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#2A2A3D";
            (e.currentTarget as HTMLButtonElement).style.color = "#A3A3C2";
          }}
        >
          Cancel
        </button>
        <button
          style={{
            flex: 2,
            padding: "12px",
            borderRadius: "12px",
            border: "none",
            backgroundColor: "#8B5CF6",
            color: "#fff",
            fontSize: "14px",
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "0.88";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "1";
          }}
        >
          Post
        </button>
      </div>

    </div>
  );
}