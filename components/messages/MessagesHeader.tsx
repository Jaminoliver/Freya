"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Plus, Settings, MessageCircle } from "lucide-react";
import { useAppStore } from "@/lib/store/appStore";
import { WelcomeMessageModal } from "@/components/messages/WelcomeMessageModal";

export function MessagesHeader() {
  const { viewer } = useAppStore();
  const isCreator  = viewer?.role === "creator";

  const [dropdownOpen,     setDropdownOpen]     = useState(false);
  const [welcomeModalOpen, setWelcomeModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <>
      <style>{`
        @keyframes dropdownIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .gear-dropdown { animation: dropdownIn 0.18s ease forwards; }
        @media (min-width: 768px) {
          .messages-header-fixed { display: none !important; }
        }
      `}</style>

      {welcomeModalOpen && (
        <WelcomeMessageModal
          onClose={() => setWelcomeModalOpen(false)}
          onSave={() => {
  console.log("Welcome message saved");
}}
        />
      )}

      <div
        className="messages-header-fixed"
        style={{
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "space-between",
          padding:         "0 16px",
          height:          "56px",
          flexShrink:      0,
          backgroundColor: "#13131F",
          borderBottom:    "1px solid #1F1F2A",
          position:        "fixed",
          top:             0,
          left:            0,
          right:           0,
          zIndex:          100,
          fontFamily:      "'Inter', sans-serif",
        }}
      >
        {/* Left — logo/title */}
        <span style={{ fontSize: "22px", fontWeight: 800, color: "#8B5CF6", letterSpacing: "-0.5px" }}>
          Messages
        </span>

        {/* Right icons */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px", position: "relative" }}>

          {/* Search */}
          <button
            style={{ background: "none", border: "none", cursor: "pointer", color: "#A3A3C2", display: "flex", alignItems: "center", padding: "8px", borderRadius: "8px", transition: "all 0.15s ease" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; e.currentTarget.style.backgroundColor = "#1C1C2E"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#A3A3C2"; e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            <Search size={22} strokeWidth={1.8} />
          </button>

          {/* New message */}
          <button
            style={{ background: "none", border: "none", cursor: "pointer", color: "#A3A3C2", display: "flex", alignItems: "center", padding: "8px", borderRadius: "8px", transition: "all 0.15s ease" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; e.currentTarget.style.backgroundColor = "#1C1C2E"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#A3A3C2"; e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            <Plus size={22} strokeWidth={1.8} />
          </button>

          {/* Gear — creators only */}
          {isCreator && (
            <div ref={dropdownRef} style={{ position: "relative" }}>
              <button
                onClick={() => setDropdownOpen((o) => !o)}
                style={{
                  background:      "none",
                  border:          "none",
                  cursor:          "pointer",
                  color:           dropdownOpen ? "#8B5CF6" : "#A3A3C2",
                  display:         "flex",
                  alignItems:      "center",
                  padding:         "8px",
                  borderRadius:    "8px",
                  transition:      "all 0.15s ease",
                  backgroundColor: dropdownOpen ? "rgba(139,92,246,0.1)" : "transparent",
                }}
                onMouseEnter={(e) => { if (!dropdownOpen) { e.currentTarget.style.color = "#FFFFFF"; e.currentTarget.style.backgroundColor = "#1C1C2E"; }}}
                onMouseLeave={(e) => { if (!dropdownOpen) { e.currentTarget.style.color = "#A3A3C2"; e.currentTarget.style.backgroundColor = "transparent"; }}}
              >
                <Settings size={22} strokeWidth={1.8} />
              </button>

              {dropdownOpen && (
                <div
                  className="gear-dropdown"
                  style={{
                    position:        "absolute",
                    top:             "calc(100% + 6px)",
                    right:           0,
                    backgroundColor: "#1C1C2E",
                    border:          "1px solid #2A2A3D",
                    borderRadius:    "12px",
                    padding:         "6px",
                    minWidth:        "220px",
                    zIndex:          100,
                    boxShadow:       "0 8px 24px rgba(0,0,0,0.4)",
                  }}
                >
                  <button
                    onClick={() => { setDropdownOpen(false); setWelcomeModalOpen(true); }}
                    style={{
                      display:         "flex",
                      alignItems:      "center",
                      gap:             "12px",
                      width:           "100%",
                      padding:         "10px 12px",
                      borderRadius:    "8px",
                      border:          "none",
                      cursor:          "pointer",
                      backgroundColor: "transparent",
                      color:           "#FFFFFF",
                      fontSize:        "14px",
                      fontFamily:      "'Inter', sans-serif",
                      textAlign:       "left",
                      transition:      "background-color 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2A2A3D")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <MessageCircle size={16} color="#8B5CF6" strokeWidth={1.8} />
                    <div>
                      <p style={{ margin: 0, fontSize: "14px", fontWeight: 500, color: "#FFFFFF" }}>Welcome Message</p>
                      <p style={{ margin: 0, fontSize: "12px", color: "#4A4A6A" }}>Auto-sent to new subscribers</p>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}