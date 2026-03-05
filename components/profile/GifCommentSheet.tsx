"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Star } from "lucide-react";

export function GifCommentSheet({ gifUrl, onSave, onClose }: {
  gifUrl: string;
  onSave: () => void;
  onClose: () => void;
}) {
  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.6)" }} />
      <div style={{ position: "relative", backgroundColor: "#13131F", borderRadius: "20px 20px 0 0", padding: "20px 20px 36px", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
        <div style={{ width: "36px", height: "4px", borderRadius: "2px", backgroundColor: "#2A2A3D", marginBottom: "4px" }} />
        <img src={gifUrl} alt="GIF" style={{ width: "200px", borderRadius: "12px", display: "block" }} />
        <span style={{ fontSize: "11px", color: "#4A4A6A", fontFamily: "'Inter', sans-serif" }}>GIF by KLIPY</span>
        <div style={{ display: "flex", gap: "12px", width: "100%" }}>
          <button
            onClick={() => { navigator.share?.({ url: gifUrl }); onClose(); }}
            style={{ flex: 1, padding: "14px", borderRadius: "14px", border: "1px solid #2A2A3D", backgroundColor: "#1C1C2E", color: "#C4C4D4", fontSize: "14px", fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
          >Share</button>
          <button
            onClick={() => { onSave(); onClose(); }}
            style={{ flex: 1, padding: "14px", borderRadius: "14px", border: "1px solid #FACC15", backgroundColor: "rgba(250,204,21,0.1)", color: "#FACC15", fontSize: "14px", fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
          >
            <Star size={15} fill="#FACC15" color="#FACC15" /> Save ⭐
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}