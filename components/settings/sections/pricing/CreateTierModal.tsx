"use client";

import { useState } from "react";
import { X } from "lucide-react";

export default function CreateTierModal({
  onSave,
  onCancel,
}: {
  onSave: (name: string, price: number) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  const numPrice = parseFloat(price) || 0;
  const canSave = name.trim().length > 0;

  const inputBase: React.CSSProperties = {
    width: "100%", borderRadius: "10px", padding: "12px 14px",
    fontSize: "14px", outline: "none", backgroundColor: "#141420",
    border: "1.5px solid #2A2A3D", color: "#F1F5F9",
    boxSizing: "border-box", fontFamily: "'Inter', sans-serif",
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        backgroundColor: "rgba(0,0,0,0.7)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        style={{
          width: "100%", maxWidth: "480px",
          backgroundColor: "#13131F", borderRadius: "16px 16px 0 0",
          border: "1.5px solid #2A2A3D", padding: "20px",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#F1F5F9", margin: 0 }}>Create New Tier</h3>
          <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: "#6B6B8A", display: "flex" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Tier name */}
          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "#8B5CF6", display: "block", marginBottom: "6px" }}>
              Tier Name
            </label>
            <input
              type="text"
              placeholder="e.g. Fan, Super Fan, VIP..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputBase}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#8B5CF6")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#2A2A3D")}
            />
          </div>

          {/* Price */}
          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "#8B5CF6", display: "block", marginBottom: "6px" }}>
              Price per Month
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: "#141420", border: "1.5px solid #2A2A3D", borderRadius: "10px", padding: "12px 14px" }}
              onFocus={() => {}} >
              <span style={{ fontSize: "14px", color: "#6B6B8A" }}>₦</span>
              <input
                type="number"
                placeholder="0 for free"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: "14px", color: "#F1F5F9", fontFamily: "'Inter', sans-serif" }}
              />
            </div>
            <p style={{ fontSize: "11px", color: "#6B6B8A", margin: "5px 0 0" }}>
              Minimum ₦0 (free) · Recommended: ₦2,000–₦25,000
            </p>
          </div>

          {/* USD equivalent */}
          {numPrice > 0 && (
            <div style={{ backgroundColor: "rgba(139,92,246,0.08)", border: "1.5px solid rgba(139,92,246,0.2)", borderRadius: "8px", padding: "10px 12px" }}>
              <p style={{ margin: 0, fontSize: "12px", color: "#A78BFA", fontFamily: "'Inter', sans-serif" }}>
                💡 Equivalent to ~${(numPrice / 1600).toFixed(2)} USD
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button
            onClick={onCancel}
            style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "1.5px solid #2A2A3D", backgroundColor: "transparent", color: "#94A3B8", fontSize: "14px", fontWeight: 500, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
          >
            Cancel
          </button>
          <button
            onClick={() => canSave && onSave(name.trim(), numPrice)}
            disabled={!canSave}
            style={{
              flex: 1, padding: "12px", borderRadius: "10px", border: "none",
              backgroundColor: canSave ? "#8B5CF6" : "#1C1C2E",
              color: canSave ? "#fff" : "#6B6B8A",
              fontSize: "14px", fontWeight: 600,
              cursor: canSave ? "pointer" : "not-allowed",
              fontFamily: "'Inter', sans-serif", transition: "background-color 0.15s",
            }}
          >
            Create Tier
          </button>
        </div>
      </div>
    </div>
  );
}