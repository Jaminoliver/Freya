// components/profile/EditCaptionModal.tsx
"use client";

import * as React from "react";

export default function EditCaptionModal({ caption, onSave, onClose }: {
  caption: string;
  onSave:  (newCaption: string) => Promise<void>;
  onClose: () => void;
}) {
  const [value,  setValue]  = React.useState(caption);
  const [saving, setSaving] = React.useState(false);
  const [error,  setError]  = React.useState<string | null>(null);
  const textareaRef         = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    textareaRef.current?.focus();
    textareaRef.current?.setSelectionRange(value.length, value.length);
  }, []);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true); setError(null);
    try { await onSave(value); onClose(); }
    catch { setError("Failed to save. Try again."); setSaving(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.7)", padding: "16px" }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width: "100%", maxWidth: "480px", backgroundColor: "#13131F", border: "1px solid #2A2A3D", borderRadius: "14px", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1E1E2E", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "15px", fontWeight: 700, color: "#F1F5F9", fontFamily: "'Inter', sans-serif" }}>Edit caption</span>
          <button onClick={onClose} style={{ width: "28px", height: "28px", borderRadius: "6px", border: "none", backgroundColor: "transparent", color: "#6B6B8A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: "16px 20px" }}>
          <textarea ref={textareaRef} value={value} onChange={(e) => setValue(e.target.value)} rows={5} style={{ width: "100%", backgroundColor: "#1C1C2E", border: "1px solid #2A2A3D", borderRadius: "10px", color: "#E2E8F0", fontSize: "14px", lineHeight: 1.6, padding: "12px", resize: "vertical", outline: "none", fontFamily: "'Inter', sans-serif", caretColor: "#8B5CF6", boxSizing: "border-box" }} onFocus={(e) => (e.currentTarget.style.borderColor = "#8B5CF6")} onBlur={(e) => (e.currentTarget.style.borderColor = "#2A2A3D")} />
          {error && <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#EF4444", fontFamily: "'Inter', sans-serif" }}>{error}</p>}
        </div>
        <div style={{ padding: "0 20px 16px", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <button onClick={onClose} style={{ padding: "9px 18px", borderRadius: "8px", border: "1px solid #2A2A3D", backgroundColor: "transparent", color: "#94A3B8", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: "9px 18px", borderRadius: "8px", border: "none", backgroundColor: saving ? "#6D4BB0" : "#8B5CF6", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", fontFamily: "'Inter', sans-serif", opacity: saving ? 0.7 : 1 }}>{saving ? "Saving..." : "Save"}</button>
        </div>
      </div>
    </div>
  );
}