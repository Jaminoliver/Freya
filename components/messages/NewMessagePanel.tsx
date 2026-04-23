"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { X, Search } from "lucide-react";
import { startConversation } from "@/app/(main)/messages/page";
interface Person {
  id:          string;
  name:        string;
  username:    string;
  avatar_url:  string | null;
  is_verified: boolean;
  role?:       string;
}

interface Props {
  onClose:   () => void;
  fans:      Person[];
  creators:  Person[];
  loading:   boolean;
  isCreator: boolean;
}

export function NewMessagePanel({ onClose, fans, creators, loading, isCreator }: Props) {
  const router = useRouter();

  const [query,    setQuery]    = useState("");
  const [tab,      setTab]      = useState<"creators" | "fans">("creators");
  const [starting, setStarting] = useState<string | null>(null);

  const handleSelect = useCallback(async (person: Person) => {
    setStarting(person.id);
    try {
      const conversationId = await startConversation(person.id);
      if (conversationId) {
        if (window.innerWidth >= 768) onClose();
        router.push(`/messages/${conversationId}`);
      }
    } catch (err) {
      console.error("[NewMessagePanel] start conv error:", err);
    } finally {
      setStarting(null);
    }
  }, [router, onClose]);

  const filterPeople = (list: Person[]) => {
    if (!query) return list;
    const q = query.toLowerCase();
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.username.toLowerCase().includes(q)
    );
  };

  const activeList = filterPeople(tab === "creators" ? creators : fans);

  return (
    <>
      <style>{`
        @keyframes slideInPanel {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
        .nm-panel { animation: slideInPanel 0.25s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .nm-row:hover  { background-color: #0D0D1A !important; }
        .nm-row:active { background-color: #111120 !important; }
        @keyframes shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .nm-skeleton {
          background: linear-gradient(90deg, #111120 25%, #1A1A2A 50%, #111120 75%);
          background-size: 400px 100%;
          animation: shimmer 1.4s infinite;
          border-radius: 8px;
        }
      `}</style>

      <div
        className="nm-panel"
        style={{
          position:        "absolute",
          inset:           0,
          zIndex:          300,
          backgroundColor: "#0A0A0F",
          display:         "flex",
          flexDirection:   "column",
          fontFamily:      "'Inter', sans-serif",
        }}
      >
        {/* Header */}
        <div style={{
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "space-between",
          padding:         "0 16px",
          height:          "56px",
          flexShrink:      0,
          borderBottom:    "1px solid #1A1A2A",
        }}>
          <span style={{ fontSize: "16px", fontWeight: 700, color: "#FFFFFF", letterSpacing: "-0.3px" }}>
            New Message
          </span>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#A3A3C2", display: "flex", padding: "8px", borderRadius: "8px" }}
          >
            <X size={20} strokeWidth={1.8} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: "12px 16px", flexShrink: 0, borderBottom: "1px solid #1A1A2A" }}>
          <div style={{
            display:         "flex",
            alignItems:      "center",
            gap:             "10px",
            backgroundColor: "#111120",
            border:          "1px solid #1A1A2A",
            borderRadius:    "12px",
            padding:         "10px 14px",
          }}>
            <Search size={16} color="#4A4A6A" strokeWidth={1.8} />
            <input
              
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              style={{
                flex:       1,
                background: "none",
                border:     "none",
                outline:    "none",
                fontSize:   "14px",
                color:      "#FFFFFF",
                fontFamily: "'Inter', sans-serif",
              }}
            />
          </div>
        </div>

        {/* Tabs — only shown for creators */}
        {isCreator && (
          <div style={{ display: "flex", borderBottom: "1px solid #1A1A2A", flexShrink: 0 }}>
            {(["creators", "fans"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex:            1,
                  padding:         "12px 0",
                  background:      "none",
                  border:          "none",
                  borderBottom:    tab === t ? "2px solid #8B5CF6" : "2px solid transparent",
                  cursor:          "pointer",
                  fontSize:        "13px",
                  fontWeight:      tab === t ? 700 : 500,
                  color:           tab === t ? "#FFFFFF" : "#4A4A6A",
                  fontFamily:      "'Inter', sans-serif",
                  transition:      "all 0.15s ease",
                  textTransform:   "capitalize",
                }}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain" }}>
          {loading ? (
            <>
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderBottom: "1px solid #1A1A2A" }}
                >
                  <div className="nm-skeleton" style={{ width: "44px", height: "44px", borderRadius: "50%", flexShrink: 0 }} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div className="nm-skeleton" style={{ width: "40%", height: "13px" }} />
                    <div className="nm-skeleton" style={{ width: "25%", height: "11px" }} />
                  </div>
                </div>
              ))}
            </>
          ) : activeList.length === 0 ? (
            <div style={{ padding: "40px 16px", textAlign: "center", color: "#4A4A6A", fontSize: "14px" }}>
              No results
            </div>
          ) : (
            activeList.map((p) => (
              <PersonRow key={p.id} person={p} loading={starting === p.id} onSelect={handleSelect} />
            ))
          )}
        </div>
      </div>
    </>
  );
}

function PersonRow({ person, loading, onSelect }: { person: Person; loading: boolean; onSelect: (p: Person) => void }) {
  const [imgBroken, setImgBroken] = useState(false);
  const showInitial = !person.avatar_url || imgBroken;

  return (
    <button
      className="nm-row"
      onClick={() => onSelect(person)}
      disabled={loading}
      style={{
        display:      "flex",
        alignItems:   "center",
        gap:          "12px",
        width:        "100%",
        padding:      "12px 16px",
        background:   "none",
        border:       "none",
        borderBottom: "1px solid #1A1A2A",
        cursor:       loading ? "default" : "pointer",
        textAlign:    "left",
        fontFamily:   "'Inter', sans-serif",
        transition:   "background-color 0.15s ease",
        opacity:      loading ? 0.6 : 1,
      }}
    >
      <div style={{ width: "44px", height: "44px", borderRadius: "50%", overflow: "hidden", flexShrink: 0, backgroundColor: "#1E1E2E" }}>
        {showInitial ? (
          <div style={{ width: "100%", height: "100%", backgroundColor: "#8B5CF6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px", fontWeight: 700, color: "#fff" }}>
            {person.name[0].toUpperCase()}
          </div>
        ) : (
          <img src={person.avatar_url!} alt={person.name} onError={() => setImgBroken(true)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <span style={{ fontSize: "14px", fontWeight: 600, color: "#FFFFFF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "160px" }}>
            {person.name}
          </span>
          {person.is_verified && (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="#8B5CF6"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          )}
        </div>
        <span style={{ fontSize: "12px", color: "#8B5CF6" }}>@{person.username}</span>
      </div>

      {loading && (
        <div style={{ width: "16px", height: "16px", borderRadius: "50%", border: "2px solid #8B5CF6", borderTopColor: "transparent", animation: "spin 0.6s linear infinite" }} />
      )}
    </button>
  );
}