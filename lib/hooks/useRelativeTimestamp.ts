// lib/hooks/useRelativeTimestamp.ts
"use client";

import { useState, useEffect } from "react";
import { getRelativeTime } from "@/lib/utils/profile";

/**
 * Returns a relative timestamp string (e.g. "2h ago") that auto-updates every 60 seconds.
 */
export function useRelativeTimestamp(dateStr: string): string {
  const [timestamp, setTimestamp] = useState(() => getRelativeTime(dateStr));

  useEffect(() => {
    setTimestamp(getRelativeTime(dateStr));
    const interval = setInterval(() => setTimestamp(getRelativeTime(dateStr)), 60000);
    return () => clearInterval(interval);
  }, [dateStr]);

  return timestamp;
}