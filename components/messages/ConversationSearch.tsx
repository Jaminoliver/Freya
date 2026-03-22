"use client";

import { useRef, useEffect } from "react";
import { X, Search } from "lucide-react";

interface Props {
  query: string;
  onChange: (query: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export function ConversationSearch({ query, onChange, onClose, isOpen }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 200);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const handleClose = () => {
    onChange("");
    onClose();
  };

  return (
    <>
      <style>{`
        .convo-search-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          height: 100%;
          padding: 0 16px;
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          transition: opacity 0.2s ease, transform 0.2s ease;
        }
        .convo-search-bar.hidden {
          opacity: 0;
          transform: translateX(20px);
          pointer-events: none;
        }
        .convo-search-input {
          flex: 1;
          background: #1C1C2E;
          border: 1px solid #2A2A3D;
          border-radius: 10px;
          padding: 8px 14px;
          font-size: 14px;
          color: #FFFFFF;
          outline: none;
          font-family: 'Inter', sans-serif;
          transition: border-color 0.15s ease;
        }
        .convo-search-input:focus { border-color: #8B5CF6; }
        .convo-search-input::placeholder { color: #4A4A6A; }
      `}</style>

      <div className={`convo-search-bar${!isOpen ? " hidden" : ""}`}>
        <button
          onClick={handleClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#A3A3C2",
            display: "flex",
            alignItems: "center",
            padding: "4px",
            borderRadius: "6px",
            flexShrink: 0,
            transition: "color 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#A3A3C2")}
        >
          <X size={22} strokeWidth={1.8} />
        </button>
        <input
          ref={inputRef}
          className="convo-search-input"
          type="text"
          placeholder="Search conversations..."
          value={query}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          onClick={handleClose}
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", padding: "4px", flexShrink: 0 }}
        >
          <Search size={20} color="#4A4A6A" strokeWidth={1.8} />
        </button>
      </div>
    </>
  );
}

/**
 * Filter conversations by search query.
 * Matches if participant name OR username starts with the query (case-insensitive).
 */
export function filterConversationsBySearch(
  conversations: { participant?: { name?: string; username?: string } }[],
  query: string
) {
  if (!query.trim()) return null; // null = no filter applied
  const q = query.toLowerCase().trim();
  return new Set(
    conversations
      .filter((c) => {
        const name = (c.participant?.name || "").toLowerCase();
        const username = (c.participant?.username || "").toLowerCase();
        return name.startsWith(q) || username.startsWith(q);
      })
      .map((c: any) => c.id as number)
  );
}