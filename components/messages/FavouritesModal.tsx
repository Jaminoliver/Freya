"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Plus, Check, Loader2 } from "lucide-react";

interface ListItem {
  id: string;
  name: string;
  isMember: boolean;
  memberCount: number;
  avatars: string[];
}

interface Props {
  conversationId: number;
  participantAvatarUrl?: string | null;
  onClose: () => void;
}

export function FavouritesModal({ conversationId, participantAvatarUrl, onClose }: Props) {
  const [lists, setLists] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Fetch lists on mount
  useEffect(() => {
    const fetchLists = async () => {
      try {
        const res = await fetch(`/api/favourites/chatlists/conversation/${conversationId}`);
        const data = await res.json();
        if (data.lists) {
          setLists(data.lists.map((l: any) => ({
            id: l.id,
            name: l.name,
            isMember: l.isMember,
            memberCount: l.memberCount ?? 0,
            avatars: l.avatars ?? [],
          })));
        }
      } catch {
        setError("Failed to load lists");
      } finally {
        setLoading(false);
      }
    };
    fetchLists();
  }, [conversationId]);

  // Focus input when shown
  useEffect(() => {
    if (showInput && inputRef.current) inputRef.current.focus();
  }, [showInput]);

  // Close on click outside
  useEffect(() => {
    const down = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("keydown", key);
    };
  }, [onClose]);

  const handleToggle = async (listId: string, isMember: boolean) => {
    if (toggling.has(listId)) return;
    setToggling((prev) => new Set(prev).add(listId));
    setError("");

    try {
      if (isMember) {
        await fetch(`/api/favourites/chatlists/${listId}/items/${conversationId}`, { method: "DELETE" });
        setLists((prev) => prev.map((l) => {
          if (l.id !== listId) return l;
          const newAvatars = participantAvatarUrl
            ? l.avatars.filter((a) => a !== participantAvatarUrl)
            : l.avatars.slice(0, -1);
          return { ...l, isMember: false, memberCount: Math.max(0, l.memberCount - 1), avatars: newAvatars };
        }));
      } else {
        await fetch(`/api/favourites/chatlists/${listId}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId }),
        });
        setLists((prev) => prev.map((l) => {
          if (l.id !== listId) return l;
          const newAvatars = participantAvatarUrl && l.avatars.length < 4 && !l.avatars.includes(participantAvatarUrl)
            ? [...l.avatars, participantAvatarUrl]
            : l.avatars;
          return { ...l, isMember: true, memberCount: l.memberCount + 1, avatars: newAvatars };
        }));
      }
    } catch {
      setError("Failed to update list");
    } finally {
      setToggling((prev) => {
        const next = new Set(prev);
        next.delete(listId);
        return next;
      });
    }
  };

  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed || creating) return;
    setCreating(true);
    setError("");

    try {
      const res = await fetch("/api/favourites/chatlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create list");
        setCreating(false);
        return;
      }

      setLists((prev) => [...prev, { id: data.list.id, name: data.list.name, isMember: false, memberCount: 0, avatars: [] }]);
      setNewName("");
      setShowInput(false);
    } catch {
      setError("Failed to create list");
    } finally {
      setCreating(false);
    }
  };

  return createPortal(
    <>
      <style>{`
        @keyframes _favModalIn {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.92); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        .fav-modal {
          animation: _favModalIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .fav-modal::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 16px;
          background: rgba(8, 8, 18, 0.92);
          -webkit-backdrop-filter: blur(32px);
          backdrop-filter: blur(32px);
          z-index: -1;
        }
        @media (max-width: 767px) {
          .fav-modal {
            width: calc(100vw - 48px) !important;
            max-width: 300px !important;
          }
        }
        .fav-list-item { transition: background-color 0.12s ease; }
        .fav-list-item:hover { background-color: rgba(255,255,255,0.05); }
        .fav-list-item:active { background-color: rgba(255,255,255,0.08); }
        .fav-create-btn { transition: all 0.15s ease; }
        .fav-create-btn:hover { background-color: rgba(139,92,246,0.15) !important; }
      `}</style>

      {/* Backdrop */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 600, backgroundColor: "rgba(0,0,0,0.6)" }}
        onMouseDown={onClose}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="fav-modal"
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          zIndex: 601,
          backgroundColor: "transparent",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "16px",
          boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
          fontFamily: "'Inter', sans-serif",
          width: "300px",
          maxHeight: "420px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Save to list
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "rgba(255,255,255,0.4)", display: "flex",
              padding: "4px", borderRadius: "6px",
            }}
          >
            <X size={16} strokeWidth={1.8} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 0" }}>
              <Loader2 size={20} color="#8B5CF6" strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />
              <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : lists.length === 0 && !showInput ? (
            <div style={{ padding: "24px 16px", textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: "13px", color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>
                No lists yet — create one to get started
              </p>
            </div>
          ) : (
            <>
              {lists.map((list) => (
                <button
                  key={list.id}
                  className="fav-list-item"
                  onClick={() => handleToggle(list.id, list.isMember)}
                  disabled={toggling.has(list.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    width: "100%",
                    padding: "10px 16px",
                    background: "none",
                    border: "none",
                    cursor: toggling.has(list.id) ? "default" : "pointer",
                    fontFamily: "'Inter', sans-serif",
                    textAlign: "left",
                    opacity: toggling.has(list.id) ? 0.5 : 1,
                  }}
                >
                  {/* Checkbox */}
                  <div style={{
                    width: "22px",
                    height: "22px",
                    borderRadius: "50%",
                    border: list.isMember ? "none" : "2px solid rgba(255,255,255,0.2)",
                    backgroundColor: list.isMember ? "#8B5CF6" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transition: "all 0.15s ease",
                  }}>
                    {list.isMember && <Check size={13} color="#FFFFFF" strokeWidth={2.5} />}
                  </div>

                  {/* Name + count */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#FFFFFF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {list.name}
                    </p>
                    <p style={{ margin: "1px 0 0", fontSize: "12px", color: "rgba(255,255,255,0.35)" }}>
                      {list.memberCount} {list.memberCount === 1 ? "user" : "users"}
                    </p>
                  </div>

                  {/* Stacked avatars */}
                  {list.avatars.length > 0 && (
                    <div style={{ display: "flex", flexShrink: 0 }}>
                      {list.avatars.slice(0, 4).map((url, i) => (
                        <div
                          key={i}
                          style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "50%",
                            overflow: "hidden",
                            border: "2px solid #0D0D1A",
                            marginLeft: i === 0 ? 0 : "-10px",
                            position: "relative",
                            zIndex: 4 - i,
                            backgroundColor: "#2A2A3D",
                          }}
                        >
                          <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </>
          )}

          {/* Create new list input */}
          {showInput && (
            <div style={{ padding: "8px 16px 4px" }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: "rgba(255,255,255,0.05)",
                borderRadius: "10px",
                padding: "4px 4px 4px 12px",
                border: "1px solid rgba(139,92,246,0.3)",
              }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") { setShowInput(false); setNewName(""); } }}
                  placeholder="List name"
                  maxLength={50}
                  style={{
                    flex: 1,
                    background: "none",
                    border: "none",
                    outline: "none",
                    color: "#FFFFFF",
                    fontSize: "13px",
                    fontFamily: "'Inter', sans-serif",
                    padding: "6px 0",
                  }}
                />
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim() || creating}
                  style={{
                    background: newName.trim() ? "#8B5CF6" : "rgba(255,255,255,0.1)",
                    border: "none",
                    borderRadius: "8px",
                    padding: "6px 12px",
                    cursor: newName.trim() && !creating ? "pointer" : "default",
                    color: "#FFFFFF",
                    fontSize: "12px",
                    fontWeight: 600,
                    fontFamily: "'Inter', sans-serif",
                    opacity: creating ? 0.6 : 1,
                    transition: "all 0.15s ease",
                  }}
                >
                  {creating ? "..." : "Add"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: "0 16px 8px" }}>
            <p style={{ margin: 0, fontSize: "11px", color: "#EF4444" }}>{error}</p>
          </div>
        )}

        {/* Footer */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px 14px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}>
          <button
            onClick={() => { setShowInput(true); setError(""); }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#8B5CF6",
              fontSize: "13px",
              fontWeight: 700,
              fontFamily: "'Inter', sans-serif",
              padding: "4px 0",
              letterSpacing: "0.02em",
              textTransform: "uppercase",
            }}
          >
            <Plus size={15} strokeWidth={2.5} />
            New list
          </button>

          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#8B5CF6",
              fontSize: "13px",
              fontWeight: 700,
              fontFamily: "'Inter', sans-serif",
              padding: "4px 0",
              letterSpacing: "0.02em",
              textTransform: "uppercase",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </>,
    document.body!
  );
}