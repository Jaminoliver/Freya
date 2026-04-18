"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

interface Props {
  onSearch:     (query: string) => void;
  placeholder?: string;
  debounceMs?:  number;
}

export function SubscriptionSearchBar({
  onSearch,
  placeholder = "Search creators…",
  debounceMs  = 200,
}: Props) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onSearch(value.trim());
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, debounceMs, onSearch]);

  const handleClear = () => {
    setValue("");
    onSearch("");
  };

  return (
    <div style={{ padding: "0 18px" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "10px",
        padding: "10px 14px",
        backgroundColor: "#1A1A2A",
        border: `1px solid ${focused ? "#8B5CF6" : "#2A2A3D"}`,
        borderRadius: "12px",
        transition: "border-color 0.15s ease",
      }}>
        <Search size={14} strokeWidth={2} color={focused ? "#8B5CF6" : "#6B6B8A"} />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "#F1F5F9",
            fontFamily: "'Inter', sans-serif",
            fontSize: "14px",
            minWidth: 0,
          }}
        />
        {value && (
          <button
            onClick={handleClear}
            aria-label="Clear"
            style={{
              width: "20px", height: "20px", borderRadius: "50%",
              background: "#2A2A3D", border: "none", cursor: "pointer",
              color: "#94A3B8",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, padding: 0,
            }}
          >
            <X size={11} strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  );
}