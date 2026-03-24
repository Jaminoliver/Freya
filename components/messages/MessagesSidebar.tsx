"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search, Plus, Settings, MessageCircle, CheckCircle } from "lucide-react";
import { MessagesHeader } from "@/components/messages/MessagesHeader";
import { FilterTabs } from "@/components/messages/FilterTabs";
import { ConversationList } from "@/components/messages/ConversationList";
import { WelcomeMessageModal } from "@/components/messages/WelcomeMessageModal";
import { ConversationSearch, filterConversationsBySearch } from "@/components/messages/ConversationSearch";
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
  const [showToast,        setShowToast]        = useState(false);
  const [searchOpen,       setSearchOpen]       = useState(false);
  const [searchQuery,      setSearchQuery]      = useState("");
  const [favouritedIds,    setFavouritedIds]    = useState<Set<number>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch favourited conversation IDs (single call)
  useEffect(() => {
    const fetchFavourites = async () => {
      try {
        const res = await fetch("/api/favourites/chatlists/all-items");
        const data = await res.json();
        if (data.conversationIds) {
          setFavouritedIds(new Set(data.conversationIds));
        }
      } catch {}
    };

    fetchFavourites();
  }, []);

  const openDesktopSearch = () => {
    setSearchOpen(true);
  };

  const closeDesktopSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const menuItems = [
    { icon: MessageCircle, label: "Welcome message", action: () => { setDropdownOpen(false); setWelcomeModalOpen(true); }, danger: false },
  ];

  const priorityCount  = conversations.filter((c) => c.unreadCount > 0).length;
  const unreadCount    = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  const favouriteCount = favouritedIds.size;

  const searchMatchIds = filterConversationsBySearch(conversations, searchQuery);

  const filtered = conversations.filter((c) => {
    // Tab filter
    if (filter === "priority" && c.unreadCount <= 0) return false;
    if (filter === "unread" && c.unreadCount <= 0) return false;
    if (filter === "favourites" && !favouritedIds.has(c.id)) return false;

    // Search filter
    if (searchMatchIds !== null && !searchMatchIds.has(c.id)) return false;

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
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .gear-dropdown { animation: dropdownIn 0.15s ease forwards; }
        .sidebar-desktop-header { display: flex; }
        @media (max-width: 767px) {
          .sidebar-desktop-header { display: none !important; }
        }
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .sb-normal {
          transition: opacity 0.2s ease, transform 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 100%;
          width: 100%;
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          padding: 0 16px;
        }
        .sb-normal.hidden { opacity: 0; transform: translateX(-20px); pointer-events: none; }
      `}</style>

      {/* Toast */}
      {showToast && (
        <div
          style={{
            position: "fixed",
            top: "24px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "12px 20px",
            borderRadius: "12px",
            backgroundColor: "#1C1C2E",
            border: "1px solid #22C55E",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            animation: "toastSlideIn 0.25s ease forwards",
            fontFamily: "'Inter', sans-serif",
          }}
        >
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
        <MessagesHeader searchQuery={searchQuery} onSearchChange={setSearchQuery} />

        {/* Mobile spacer for fixed header */}
        <div className="mobile-header-spacer" style={{ height: "56px", flexShrink: 0 }} />

        <style>{`
          @media (min-width: 768px) {
            .mobile-header-spacer { display: none !important; }
          }
        `}</style>

        <div
          className="sidebar-desktop-header"
          style={{
            position:        "relative",
            height:          "56px",
            flexShrink:      0,
            backgroundColor: "#13131F",
            borderBottom:    "1px solid #1F1F2A",
            fontFamily:      "'Inter', sans-serif",
            zIndex:          50,
          }}
        >
          {/* Normal header */}
          <div className={`sb-normal${searchOpen ? " hidden" : ""}`}>
            <span style={{ fontSize: "22px", fontWeight: 800, color: "#8B5CF6", letterSpacing: "-0.5px" }}>
              Messages
            </span>

            <div style={{ display: "flex", alignItems: "center", gap: "4px", position: "relative" }}>
              <button
                onClick={openDesktopSearch}
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
                        minWidth:        "180px",
                        zIndex:          100,
                        boxShadow:       "0 8px 24px rgba(0,0,0,0.4)",
                      }}
                    >
                      {menuItems.map(({ icon: Icon, label, action, danger }) => (
                        <button
                          key={label}
                          onClick={action}
                          style={{
                            display:         "flex",
                            alignItems:      "center",
                            gap:             "10px",
                            width:           "100%",
                            padding:         "10px 12px",
                            borderRadius:    "8px",
                            border:          "none",
                            cursor:          "pointer",
                            backgroundColor: "transparent",
                            color:           danger ? "#EF4444" : "#FFFFFF",
                            fontSize:        "14px",
                            fontFamily:      "'Inter', sans-serif",
                            textAlign:       "left",
                            transition:      "background-color 0.15s ease",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2A2A3D")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        >
                          <Icon size={15} color={danger ? "#EF4444" : "#A3A3C2"} strokeWidth={1.8} />
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Search header */}
          <ConversationSearch
            query={searchQuery}
            onChange={setSearchQuery}
            onClose={closeDesktopSearch}
            isOpen={searchOpen}
          />
        </div>

        <FilterTabs
          active={filter}
          onChange={setFilter}
          priorityCount={priorityCount}
          unreadCount={unreadCount}
          favouriteCount={favouriteCount}
        />

        <div style={{ flex: 1, overflowY: "auto" }}>
          <ConversationList
            conversations={filtered}
            activeId={urlActiveId}
            onSelect={handleSelect}
            typingConversations={typingConversations}
            favouritedIds={favouritedIds}
          />
        </div>
      </div>
    </>
  );
}