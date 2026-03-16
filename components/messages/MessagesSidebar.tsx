"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search, Plus, Settings, MessageCircle } from "lucide-react";
import { MessagesHeader } from "@/components/messages/MessagesHeader";
import { FilterTabs } from "@/components/messages/FilterTabs";
import { ConversationList } from "@/components/messages/ConversationList";
import { WelcomeMessageModal } from "@/components/messages/WelcomeMessageModal";
import { useAppStore } from "@/lib/store/appStore";
import type { Conversation, FilterTab } from "@/lib/types/messages";

interface Props {
  conversations:        Conversation[];
  activeId:             number | null;
  onSelect?:            (id: string) => void;
  onNewConversation?:   (conv: Conversation) => void;
  typingConversations?: Set<number>;
}

export function MessagesSidebar({ conversations, activeId, onSelect, onNewConversation, typingConversations = new Set() }: Props) {
  const router   = useRouter();
  const pathname = usePathname();
  const { viewer } = useAppStore();
  const isCreator  = viewer?.role === "creator";

  const [filter,           setFilter]           = useState<FilterTab>("all");
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

  const priorityCount = conversations.filter((c) => c.unreadCount > 0).length;
  const unreadCount   = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  const filtered = conversations.filter((c) => {
    if (filter === "priority") return c.unreadCount > 0;
    if (filter === "unread")   return c.unreadCount > 0;
    return true;
  });

  const urlActiveId = pathname.startsWith("/messages/")
    ? pathname.replace("/messages/", "")
    : null;

  const handleSelect = (id: string) => {
    onSelect?.(id);
    router.push(`/messages/${id}`);
  };

  return (
    <>
      <style>{`
        @keyframes dropdownIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .gear-dropdown { animation: dropdownIn 0.18s ease forwards; }
        .sidebar-desktop-header { display: flex; }
        @media (max-width: 767px) {
          .sidebar-desktop-header { display: none !important; }
        }
      `}</style>

      {welcomeModalOpen && (
        <WelcomeMessageModal
          onClose={() => setWelcomeModalOpen(false)}
          onSave={(data) => {
            console.log("Welcome message saved:", data);
            setWelcomeModalOpen(false);
          }}
        />
      )}

      <div
        style={{
          width:           "100%",
          height:          "100vh",
          backgroundColor: "#0D0D1A",
          borderRight:     "1px solid #1E1E2E",
          display:         "flex",
          flexDirection:   "column",
          overflow:        "hidden",
        }}
      >
        <MessagesHeader />

        <div
          className="sidebar-desktop-header"
          style={{
            alignItems:      "center",
            justifyContent:  "space-between",
            padding:         "0 16px",
            height:          "56px",
            flexShrink:      0,
            backgroundColor: "#13131F",
            borderBottom:    "1px solid #1F1F2A",
            fontFamily:      "'Inter', sans-serif",
          }}
        >
          <span style={{ fontSize: "22px", fontWeight: 800, color: "#8B5CF6", letterSpacing: "-0.5px" }}>
            Messages
          </span>

          <div style={{ display: "flex", alignItems: "center", gap: "4px", position: "relative" }}>
            <button
              style={{ background: "none", border: "none", cursor: "pointer", color: "#A3A3C2", display: "flex", alignItems: "center", padding: "8px", borderRadius: "8px", transition: "all 0.15s ease" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; e.currentTarget.style.backgroundColor = "#1C1C2E"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#A3A3C2"; e.currentTarget.style.backgroundColor = "transparent"; }}
            >
              <Search size={22} strokeWidth={1.8} />
            </button>

            <button
              style={{ background: "none", border: "none", cursor: "pointer", color: "#A3A3C2", display: "flex", alignItems: "center", padding: "8px", borderRadius: "8px", transition: "all 0.15s ease" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; e.currentTarget.style.backgroundColor = "#1C1C2E"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#A3A3C2"; e.currentTarget.style.backgroundColor = "transparent"; }}
            >
              <Plus size={22} strokeWidth={1.8} />
            </button>

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

        <FilterTabs
          active={filter}
          onChange={setFilter}
          priorityCount={priorityCount}
          unreadCount={unreadCount}
        />

        <div style={{ flex: 1, overflowY: "auto" }}>
          <ConversationList
            conversations={filtered}
            activeId={urlActiveId}
            onSelect={handleSelect}
            typingConversations={typingConversations}
          />
        </div>
      </div>
    </>
  );
}