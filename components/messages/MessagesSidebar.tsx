"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search, Plus, Settings, MessageCircle, CheckCircle, Archive } from "lucide-react";
import { MessagesHeader } from "@/components/messages/MessagesHeader";
import { FilterTabs } from "@/components/messages/FilterTabs";
import { ConversationList } from "@/components/messages/ConversationList";
import { WelcomeMessageModal } from "@/components/messages/WelcomeMessageModal";
import { ConversationSearch, filterConversationsBySearch } from "@/components/messages/ConversationSearch";
import { MessagesSkeleton } from "@/components/loadscreen/MessagesSkeleton";
import { useConversations } from "@/app/(main)/messages/page";
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
  const { loading } = useConversations();
  const isCreator  = viewer?.role === "creator";

  const [filter,           setFilter]           = useState<FilterTab>("all");
  const [dropdownOpen,     setDropdownOpen]     = useState(false);
  const [welcomeModalOpen, setWelcomeModalOpen] = useState(false);
  const [showToast,        setShowToast]        = useState(false);
  const [searchOpen,       setSearchOpen]       = useState(false);
  const [searchQuery,      setSearchQuery]      = useState("");
  const [favouritedIds,    setFavouritedIds]    = useState<Set<number>>(new Set());
  const [archivedCount,    setArchivedCount]    = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchFavourites = async () => {
      try {
        const res  = await fetch("/api/favourites/chatlists/all-items");
        const data = await res.json();
        if (data.conversationIds) setFavouritedIds(new Set(data.conversationIds));
      } catch {}
    };
    fetchFavourites();
    window.addEventListener("favourites-updated", fetchFavourites);
    return () => window.removeEventListener("favourites-updated", fetchFavourites);
  }, []);

  useEffect(() => {
    const fetchArchivedCount = async () => {
      try {
        const res  = await fetch("/api/conversations?archived=true");
        const data = await res.json();
        setArchivedCount(data.conversations?.length ?? 0);
      } catch {}
    };
    fetchArchivedCount();
    window.addEventListener("conversations-updated", fetchArchivedCount);
    return () => window.removeEventListener("conversations-updated", fetchArchivedCount);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const menuItems = [
    { icon: MessageCircle, label: "Welcome message", action: () => { setDropdownOpen(false); setWelcomeModalOpen(true); }, danger: false },
  ];

  const unreadCount    = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  const favouriteCount = favouritedIds.size;
  const searchMatchIds = filterConversationsBySearch(conversations, searchQuery);

  const filtered = conversations.filter((c) => {
    if (filter === "unread"     && c.unreadCount <= 0)         return false;
    if (filter === "favourites" && !favouritedIds.has(c.id))   return false;
    if (searchMatchIds !== null && !searchMatchIds.has(c.id))  return false;
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
        .archived-row:hover  { background-color: #0D0D1A !important; }
        .archived-row:active { background-color: #111120 !important; }
      `}</style>

      {showToast && (
        <div style={{ position: "fixed", top: "24px", left: "50%", transform: "translateX(-50%)", zIndex: 10000, display: "flex", alignItems: "center", gap: "10px", padding: "12px 20px", borderRadius: "12px", backgroundColor: "#111120", border: "1px solid #22C55E", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", animation: "toastSlideIn 0.25s ease forwards", fontFamily: "'Inter', sans-serif" }}>
          <CheckCircle size={18} color="#22C55E" strokeWidth={2} />
          <span style={{ fontSize: "14px", fontWeight: 600, color: "#FFFFFF" }}>Welcome message saved</span>
        </div>
      )}

      {welcomeModalOpen && (
        <WelcomeMessageModal
          onClose={() => setWelcomeModalOpen(false)}
          onSave={() => { setShowToast(true); setTimeout(() => setShowToast(false), 2500); }}
        />
      )}

      <div
        style={{
          width:           "100%",
          height:          "100vh",
          backgroundColor: "#0A0A0F",   // ← matched to notification page
          borderRight:     "1px solid #1A1A2A",
          display:         "flex",
          flexDirection:   "column",
          overflow:        "hidden",
        }}
      >
        <MessagesHeader searchQuery={searchQuery} onSearchChange={setSearchQuery} />

        {/* Mobile spacer for fixed header */}
        <div className="mobile-header-spacer" style={{ height: "56px", flexShrink: 0 }} />
        <style>{`@media (min-width: 768px) { .mobile-header-spacer { display: none !important; } }`}</style>

        {/* Desktop header */}
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
          <div className={`sb-normal${searchOpen ? " hidden" : ""}`}>
            <span style={{ fontSize: "22px", fontWeight: 800, color: "#8B5CF6", letterSpacing: "-0.5px" }}>
              Messages
            </span>

            <div style={{ display: "flex", alignItems: "center", gap: "4px", position: "relative" }}>
              <button
                onClick={() => setSearchOpen(true)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#6B6B8A", display: "flex", alignItems: "center", padding: "8px", borderRadius: "8px", transition: "all 0.15s ease" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; e.currentTarget.style.backgroundColor = "#111120"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#6B6B8A"; e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                <Search size={22} strokeWidth={1.8} />
              </button>

              <button
                style={{ background: "none", border: "none", cursor: "pointer", color: "#6B6B8A", display: "flex", alignItems: "center", padding: "8px", borderRadius: "8px", transition: "all 0.15s ease" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; e.currentTarget.style.backgroundColor = "#111120"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#6B6B8A"; e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                <Plus size={22} strokeWidth={1.8} />
              </button>

              {isCreator && (
                <div ref={dropdownRef} style={{ position: "relative" }}>
                  <button
                    onClick={() => setDropdownOpen((o) => !o)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: dropdownOpen ? "#8B5CF6" : "#6B6B8A", display: "flex", alignItems: "center", padding: "8px", borderRadius: "8px", transition: "all 0.15s ease", backgroundColor: dropdownOpen ? "rgba(139,92,246,0.1)" : "transparent" }}
                    onMouseEnter={(e) => { if (!dropdownOpen) { e.currentTarget.style.color = "#FFFFFF"; e.currentTarget.style.backgroundColor = "#111120"; }}}
                    onMouseLeave={(e) => { if (!dropdownOpen) { e.currentTarget.style.color = "#6B6B8A";  e.currentTarget.style.backgroundColor = "transparent"; }}}
                  >
                    <Settings size={22} strokeWidth={1.8} />
                  </button>

                  {dropdownOpen && (
                    <div
                      className="gear-dropdown"
                      style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, backgroundColor: "#111120", border: "1px solid #1A1A2A", borderRadius: "12px", padding: "6px", minWidth: "180px", zIndex: 100, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}
                    >
                      {menuItems.map(({ icon: Icon, label, action, danger }) => (
                        <button
                          key={label}
                          onClick={action}
                          style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "10px 12px", borderRadius: "8px", border: "none", cursor: "pointer", backgroundColor: "transparent", color: danger ? "#EF4444" : "#FFFFFF", fontSize: "14px", fontFamily: "'Inter', sans-serif", textAlign: "left", transition: "background-color 0.15s ease" }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1A1A2A")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        >
                          <Icon size={15} color={danger ? "#EF4444" : "#6B6B8A"} strokeWidth={1.8} />
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <ConversationSearch
            query={searchQuery}
            onChange={setSearchQuery}
            onClose={() => { setSearchOpen(false); setSearchQuery(""); }}
            isOpen={searchOpen}
          />
        </div>

        <FilterTabs
          active={filter}
          onChange={setFilter}
          unreadCount={unreadCount}
          favouriteCount={favouriteCount}
        />

        {/* Archived row */}
        {archivedCount > 0 && filter === "all" && !searchQuery && (
          <button
            className="archived-row"
            onClick={() => router.push("/messages/archived")}
            style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%", padding: "14px 16px", background: "none", border: "none", borderBottom: "1px solid #1A1A2A", cursor: "pointer", fontFamily: "'Inter', sans-serif", transition: "background-color 0.15s ease", flexShrink: 0 }}
          >
            <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "#111120", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Archive size={20} color="#8B5CF6" strokeWidth={1.6} />
            </div>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "#FFFFFF", flex: 1, textAlign: "left" }}>Archived</span>
            <span style={{ fontSize: "13px", color: "#4A4A6A" }}>{archivedCount}</span>
          </button>
        )}

        {/* Conversation list or skeleton */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <MessagesSkeleton count={12} />
          ) : (
            <ConversationList
              conversations={filtered}
              activeId={urlActiveId}
              onSelect={handleSelect}
              typingConversations={typingConversations}
              favouritedIds={favouritedIds}
            />
          )}
        </div>
      </div>
    </>
  );
}