"use client";

import { useState } from "react";
import { Eraser, X } from "lucide-react";

interface Props {
  conversationId:  number;
  participantName: string;
  onClose:         () => void;
  onCleared:       () => void;
}

export function ConversationActionModal({ conversationId, participantName, onClose, onCleared }: Props) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const handleClear = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`/api/conversations/${conversationId}/messages/clear`, {
        method:  "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ forEveryone: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Clear failed");
      onCleared();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes sheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", zIndex: 400, animation: "fadeIn 0.15s ease" }}
      />

      <div style={{
        position:        "fixed",
        bottom:          0,
        left:            0,
        right:           0,
        backgroundColor: "#1C1C2E",
        borderRadius:    "20px 20px 0 0",
        padding:         "12px 0 40px",
        zIndex:          401,
        fontFamily:      "'Inter', sans-serif",
        animation:       "sheetUp 0.22s ease",
      }}>
        <div style={{ width: "36px", height: "4px", borderRadius: "2px", backgroundColor: "#2A2A3D", margin: "0 auto 20px" }} />

        <div style={{ padding: "0 20px 16px", borderBottom: "1px solid #2A2A3D", marginBottom: "8px" }}>
          <p style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#FFFFFF" }}>Clear chat</p>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#A3A3C2" }}>
            Clear all messages with {participantName}? This only affects your view.
          </p>
        </div>

        {error && (
          <div style={{ margin: "0 20px 12px", padding: "10px 14px", backgroundColor: "rgba(239,68,68,0.1)", borderRadius: "8px" }}>
            <p style={{ margin: 0, fontSize: "13px", color: "#EF4444" }}>{error}</p>
          </div>
        )}

        <button
          onClick={handleClear}
          disabled={loading}
          style={{ display: "flex", alignItems: "center", gap: "16px", width: "100%", padding: "14px 20px", background: "none", border: "none", cursor: loading ? "default" : "pointer", opacity: loading ? 0.5 : 1 }}
          onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = "#2A2A3D"; }}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Eraser size={20} color="#EF4444" strokeWidth={1.8} />
          </div>
          <p style={{ margin: 0, fontSize: "15px", fontWeight: 500, color: "#EF4444" }}>
            {loading ? "Clearing..." : "Clear chat"}
          </p>
        </button>

        <button
          onClick={onClose}
          disabled={loading}
          style={{ display: "flex", alignItems: "center", gap: "16px", width: "100%", padding: "14px 20px", background: "none", border: "none", cursor: "pointer", borderTop: "1px solid #2A2A3D", marginTop: "4px" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2A2A3D")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#2A2A3D", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <X size={20} color="#A3A3C2" strokeWidth={1.8} />
          </div>
          <p style={{ margin: 0, fontSize: "15px", color: "#A3A3C2" }}>Cancel</p>
        </button>
      </div>
    </>
  );
}