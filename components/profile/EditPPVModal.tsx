// components/profile/EditPPVModal.tsx
"use client";

import * as React from "react";

export default function EditPPVModal({ currentPrice, onSave, onRemove, onClose }: {
  currentPrice: number | null;
  onSave:       (priceKobo: number) => Promise<void>;
  onRemove?:    () => Promise<void>;
  onClose:      () => void;
}) {
  const formatComma = (n: number) => n.toLocaleString("en-NG");
  const [display,  setDisplay]  = React.useState(currentPrice != null ? formatComma(currentPrice) : "");
  const [rawValue, setRawValue] = React.useState<number | null>(currentPrice);
  const [saving,   setSaving]   = React.useState(false);
  const [removing, setRemoving] = React.useState(false);
  const [error,    setError]    = React.useState<string | null>(null);
  const inputRef                = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => { inputRef.current?.focus(); }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, "");
    const parsed = parseInt(raw, 10);
    if (raw === "") { setDisplay(""); setRawValue(null); return; }
    if (isNaN(parsed)) return;
    setRawValue(parsed);
    setDisplay(formatComma(parsed));
  };

  const handleSave = async () => {
    if (!rawValue || rawValue <= 0) { setError("Enter a valid price in ₦."); return; }
    if (saving) return;
    setSaving(true); setError(null);
    try { await onSave(Math.round(rawValue * 100)); onClose(); }
    catch { setError("Failed to save. Try again."); setSaving(false); }
  };

  const handleRemove = async () => {
    if (!onRemove || removing) return;
    setRemoving(true); setError(null);
    try { await onRemove(); onClose(); }
    catch { setError("Failed to remove. Try again."); setRemoving(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.7)", padding: "16px" }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width: "100%", maxWidth: "480px", backgroundColor: "#13131F", border: "1px solid #2A2A3D", borderRadius: "14px", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1E1E2E", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "15px", fontWeight: 700, color: "#F1F5F9", fontFamily: "'Inter', sans-serif" }}>{currentPrice ? "Edit PPV price" : "Lock post & set price"}</span>
          <button onClick={onClose} style={{ width: "28px", height: "28px", borderRadius: "6px", border: "none", backgroundColor: "transparent", color: "#6B6B8A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: "16px 20px" }}>
          <p style={{ margin: "0 0 12px", fontSize: "13px", color: "#6B6B8A", fontFamily: "'Inter', sans-serif" }}>{currentPrice ? "Update the price fans pay to unlock this post." : "Set a price to lock this post as pay-per-view."}</p>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "14px", color: "#8B5CF6", fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>₦</span>
            <input ref={inputRef} type="text" inputMode="numeric" placeholder="e.g. 10,000" value={display} onChange={handleChange} style={{ width: "100%", backgroundColor: "#1C1C2E", border: "1px solid #2A2A3D", borderRadius: "10px", color: "#E2E8F0", fontSize: "14px", padding: "12px 12px 12px 28px", outline: "none", fontFamily: "'Inter', sans-serif", caretColor: "#8B5CF6", boxSizing: "border-box" }} onFocus={(e) => (e.currentTarget.style.borderColor = "#8B5CF6")} onBlur={(e) => (e.currentTarget.style.borderColor = "#2A2A3D")} />
          </div>
          {error && <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#EF4444", fontFamily: "'Inter', sans-serif" }}>{error}</p>}
        </div>
        <div style={{ padding: "0 20px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
          {currentPrice && onRemove ? (
            <button onClick={handleRemove} disabled={removing} style={{ padding: "9px 18px", borderRadius: "8px", border: "1px solid #EF4444", backgroundColor: "transparent", color: "#EF4444", fontSize: "13px", fontWeight: 600, cursor: removing ? "not-allowed" : "pointer", fontFamily: "'Inter', sans-serif", opacity: removing ? 0.7 : 1 }}>{removing ? "Removing..." : "Make free"}</button>
          ) : <div />}
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={onClose} style={{ padding: "9px 18px", borderRadius: "8px", border: "1px solid #2A2A3D", backgroundColor: "transparent", color: "#94A3B8", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ padding: "9px 18px", borderRadius: "8px", border: "none", backgroundColor: saving ? "#6D4BB0" : "#8B5CF6", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", fontFamily: "'Inter', sans-serif", opacity: saving ? 0.7 : 1 }}>{saving ? "Saving..." : currentPrice ? "Update price" : "Lock post"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}