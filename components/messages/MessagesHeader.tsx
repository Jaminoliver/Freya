"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Plus, Settings, CheckCircle } from "lucide-react";
import { useAppStore } from "@/lib/store/appStore";
import { WelcomeMessageModal } from "@/components/messages/WelcomeMessageModal";
import { ConversationSearch } from "@/components/messages/ConversationSearch";
import { MessagesSettingsModal } from "@/components/messages/MessagesSettingsModal";

interface MessagesHeaderProps {
  searchQuery?:    string;
  onSearchChange?: (query: string) => void;
  onNewMessage?:   () => void;
}

export function MessagesHeader({ searchQuery = "", onSearchChange, onNewMessage }: MessagesHeaderProps) {
  const { viewer } = useAppStore();
  const isCreator  = viewer?.role === "creator";

  const [dropdownOpen,     setDropdownOpen]     = useState(false);
  const [dropdownPos,      setDropdownPos]      = useState({ x: 0, y: 0 });
  const [welcomeModalOpen, setWelcomeModalOpen] = useState(false);
  const [showToast,        setShowToast]        = useState(false);
  const [searchOpen,       setSearchOpen]       = useState(false);

  const gearBtnRef = useRef<HTMLButtonElement>(null);

  const openSearch  = () => setSearchOpen(true);
  const closeSearch = () => { setSearchOpen(false); onSearchChange?.(""); };

  const handleOpenDropdown = () => {
    if (gearBtnRef.current) {
      const rect = gearBtnRef.current.getBoundingClientRect();
      setDropdownPos({ x: rect.right, y: rect.bottom + 6 });
    }
    setDropdownOpen(true);
  };

  return (
    <>
      <style>{`
        @media (min-width: 768px) {
          .messages-header-fixed { display: none !important; }
        }
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateY(-12px) translateX(-50%); }
          to   { opacity: 1; transform: translateY(0)    translateX(-50%); }
        }
        .mh-normal {
          transition: opacity 0.2s ease, transform 0.2s ease;
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
        }
        .mh-normal.hidden { opacity: 0; transform: translateX(-20px); pointer-events: none; }
        .mh-icon-btn {
          background: none; border: none; cursor: pointer;
          color: #A3A3C2; display: flex; align-items: center;
          padding: 8px; border-radius: 8px; transition: all 0.15s ease;
        }
        .mh-icon-btn:hover { color: #FFFFFF; background-color: #1C1C2E; }
        .mh-icon-btn--active { color: #8B5CF6 !important; background-color: rgba(139,92,246,0.1) !important; }
      `}</style>

      {/* Toast */}
      {showToast && (
        <div style={{
          position:        "fixed",
          top:             "24px",
          left:            "50%",
          transform:       "translateX(-50%)",
          zIndex:          10000,
          display:         "flex",
          alignItems:      "center",
          gap:             "10px",
          padding:         "12px 20px",
          borderRadius:    "12px",
          backgroundColor: "#1C1C2E",
          border:          "1px solid #22C55E",
          boxShadow:       "0 8px 32px rgba(0,0,0,0.5)",
          animation:       "toastSlideIn 0.25s ease forwards",
          fontFamily:      "'Inter', sans-serif",
          whiteSpace:      "nowrap",
        }}>
          <CheckCircle size={18} color="#22C55E" strokeWidth={2} />
          <span style={{ fontSize: "14px", fontWeight: 600, color: "#FFFFFF" }}>
            Welcome message saved
          </span>
        </div>
      )}

      {welcomeModalOpen && (
        <WelcomeMessageModal
          onClose={() => setWelcomeModalOpen(false)}
          onSave={() => {
            setShowToast(true);
            setTimeout(() => setShowToast(false), 2500);
          }}
        />
      )}

      {dropdownOpen && (
        <MessagesSettingsModal
          onClose={() => setDropdownOpen(false)}
          onWelcomeMessage={() => setWelcomeModalOpen(true)}
          x={dropdownPos.x}
          y={dropdownPos.y}
        />
      )}

      <div
        className="messages-header-fixed"
        style={{
          position:        "relative",
          height:          "56px",
          flexShrink:      0,
          backgroundColor: "var(--background)",
          zIndex:          100,
          fontFamily:      "'Inter', sans-serif",
        }}
      >
        {/* Normal header */}
        <div className={`mh-normal${searchOpen ? " hidden" : ""}`}>
          <span style={{ fontSize: "22px", fontWeight: 800, color: "#8B5CF6", letterSpacing: "-0.5px" }}>
            Messages
          </span>

          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <button className="mh-icon-btn" onClick={openSearch}>
              <Search size={22} strokeWidth={1.8} />
            </button>

            <button className="mh-icon-btn" onClick={onNewMessage}>
              <Plus size={22} strokeWidth={1.8} />
            </button>

            {isCreator && (
              <button
                ref={gearBtnRef}
                className={`mh-icon-btn${dropdownOpen ? " mh-icon-btn--active" : ""}`}
                onClick={handleOpenDropdown}
              >
                <Settings size={22} strokeWidth={1.8} />
              </button>
            )}
          </div>
        </div>

        {/* Search header */}
        <ConversationSearch
          query={searchQuery}
          onChange={(q) => onSearchChange?.(q)}
          onClose={closeSearch}
          isOpen={searchOpen}
        />
      </div>
    </>
  );
}