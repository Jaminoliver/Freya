"use client";

import { useAppStore } from "@/lib/store/appStore";
import { useEffect, useState } from "react";

export default function PageLoader() {
  const isNavigating = useAppStore((s) => s.isNavigating);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isNavigating) {
      setVisible(true);
    } else {
      // Small delay before hiding so content is ready
      const t = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(t);
    }
  }, [isNavigating]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "rgba(10, 10, 15, 0.6)",
        backdropFilter: "blur(2px)",
        WebkitBackdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: isNavigating ? 1 : 0,
        transition: "opacity 0.2s ease",
        pointerEvents: isNavigating ? "all" : "none",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          border: "3px solid rgba(255,255,255,0.1)",
          borderTop: "3px solid #ffffff",
          animation: "freya-spin 0.7s linear infinite",
        }}
      />
      <style>{`
        @keyframes freya-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}