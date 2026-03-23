"use client";

import { useState } from "react";

interface BlockConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  type: "block" | "restrict";
  username: string;
}

export default function BlockConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  type,
  username,
}: BlockConfirmModalProps) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const isBlock = type === "block";

  const title = isBlock ? "Block user?" : "Restrict user?";
  const description = isBlock
    ? `@${username} won't be able to see your profile, content, or message you. Their subscription will be cancelled.`
    : `@${username} can still see your content and purchase PPVs, but won't be able to message, comment, or like.`;
  const confirmLabel = isBlock ? "Block" : "Restrict";
  const confirmColor = isBlock ? "#EF4444" : "#F59E0B";

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
      onClose();
    }
  };

  return (
    <>
      <style>{`
        @keyframes bcmFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes bcmScaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9998,
          backgroundColor: "rgba(0,0,0,0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          animation: "bcmFadeIn 0.15s ease forwards",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: "#1C1C2E",
            border: "1px solid #2A2A3D",
            borderRadius: "16px",
            padding: "24px",
            width: "min(340px, calc(100vw - 40px))",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            fontFamily: "'Inter', sans-serif",
            animation: "bcmScaleIn 0.2s ease forwards",
          }}
        >
          <p style={{ margin: "0 0 6px", fontSize: "16px", fontWeight: 700, color: "#FFFFFF" }}>
            {title}
          </p>
          <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#A3A3C2", lineHeight: 1.5 }}>
            {description}
          </p>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={onClose}
              disabled={loading}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "10px",
                border: "1px solid #2A2A3D",
                backgroundColor: "transparent",
                color: "#A3A3C2",
                fontSize: "14px",
                fontWeight: 600,
                cursor: loading ? "default" : "pointer",
                fontFamily: "'Inter', sans-serif",
                transition: "all 0.15s ease",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "10px",
                border: "none",
                backgroundColor: confirmColor,
                color: "#FFFFFF",
                fontSize: "14px",
                fontWeight: 600,
                cursor: loading ? "default" : "pointer",
                fontFamily: "'Inter', sans-serif",
                opacity: loading ? 0.6 : 1,
                transition: "opacity 0.15s ease",
              }}
            >
              {loading ? "..." : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}