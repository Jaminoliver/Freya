"use client";

import { useEffect, useRef, useState } from "react";

const AWAY_MS = 5 * 60 * 1000; // 5 minutes

export function useVisibilitySplash() {
  const [showSplash, setShowSplash] = useState(false);
  const hiddenAt = useRef<number | null>(null);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        hiddenAt.current = Date.now();
      } else {
        if (hiddenAt.current && Date.now() - hiddenAt.current >= AWAY_MS) {
          setShowSplash(true);
        }
        hiddenAt.current = null;
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const dismissVisibilitySplash = () => setShowSplash(false);

  return { showSplash, dismissVisibilitySplash };
}