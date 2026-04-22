"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store/appStore";

// Preload logo immediately when module loads — prevents delayed appearance
if (typeof window !== "undefined") {
  const _preload = new window.Image();
  _preload.src = "/freya_logo.png";
}

interface Props {
  onDone?: () => void;
}

export default function SplashScreen({ onDone }: Props) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading]   = useState(false);
  const viewer = useAppStore((s) => s.viewer);

  useEffect(() => {
    // Hard cap — never block more than 4s
    const timeout = setTimeout(() => dismiss(), 4000);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (viewer) dismiss();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewer]);

  const dismiss = () => {
    setFading(true);
    setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, 400);
  };

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes freyaPulse {
          0%   { transform: scale(1,    1);    }
          15%  { transform: scale(1.22, 0.78); }
          30%  { transform: scale(0.82, 1.22); }
          50%  { transform: scale(1.15, 0.86); }
          68%  { transform: scale(0.92, 1.10); }
          82%  { transform: scale(1.06, 0.95); }
          92%  { transform: scale(0.97, 1.03); }
          100% { transform: scale(1,    1);    }
        }
        .freya-logo-pulse {
          animation: freyaPulse 1.1s cubic-bezier(0.36, 0.07, 0.19, 0.97) infinite;
          transform-origin: center center;
        }
        @keyframes splashFadeOut {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
        .splash-fade-out {
          animation: splashFadeOut 0.4s ease forwards;
        }
      `}</style>

      <div
        className={fading ? "splash-fade-out" : ""}
        style={{
          position:        "fixed",
          inset:           0,
          zIndex:          9999,
          backgroundColor: "#0A0A0F",
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
        }}
      >
        <img
          src="/freya_logo.png"
          alt="Fréya"
          className="freya-logo-pulse"
          style={{
            width:    "clamp(320px, 80vw, 520px)",
            height:   "auto",
            userSelect: "none",
            pointerEvents: "none",
          }}
        />
      </div>
    </>
  );
}