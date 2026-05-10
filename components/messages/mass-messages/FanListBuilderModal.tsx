"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Plus, Check, Search, Loader2, Trash2 } from "lucide-react";

interface Fan {
  id:           string;
  display_name: string;
  username:     string;
  avatar_url:   string | null;
  total_spend:  number;
}

interface FanList {
  id:           number;
  name:         string;
  member_count: number;
  fan_ids:      string[];
}

interface Props {
  onClose: () => void;
  onListCreated: (list: FanList) => void;
}

function formatSpend(kobo: number): string {
  if (kobo === 0) return "";
  const naira = kobo / 100;
  if (naira >= 1_000_000) return `₦${(naira / 1_000_000).toFixed(1)}M`;
  if (naira >= 1_000)     return `₦${(naira / 1_000).toFixed(0)}k`;
  return `₦${naira.toFixed(0)}`;
}

export function FanListBuilderModal({ onClose, onListCreated }: Props) {
  const [fans,        setFans]        = useState<Fan[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [selected,    setSelected]    = useState<Set<string>>(new Set());
  const [search,      setSearch]      = useState("");
  const [listName,    setListName]    = useState("");
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");
  const [step,        setStep]        = useState<"pick" | "name">("pick");

  const modalRef  = useRef<HTMLDivElement>(null);
  const nameRef   = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/fan-lists/fans")
      .then((r) => r.json())
      .then((data) => setFans(data.fans ?? []))
      .catch(() => setError("Failed to load fans"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (step === "name" && nameRef.current) nameRef.current.focus();
  }, [step]);

  useEffect(() => {
    const down = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose();
    };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("keydown", key);
    };
  }, [onClose]);

  const filtered = fans.filter((f) =>
    f.display_name.toLowerCase().includes(search.toLowerCase()) ||
    f.username.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    const trimmed = listName.trim();
    if (!trimmed || selected.size === 0 || saving) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/fan-lists", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name: trimmed, fan_ids: [...selected] }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to save"); setSaving(false); return; }
      onListCreated(data.list);
      onClose();
    } catch {
      setError("Failed to save list");
      setSaving(false);
    }
  };

  return createPortal(
    <>
      <style>{`
        @keyframes _flbIn {
          from { opacity: 0; transform: translate(-50%,-50%) scale(0.93); }
          to   { opacity: 1; transform: translate(-50%,-50%) scale(1); }
        }
        .flb-modal { animation: _flbIn 0.2s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .flb-fan-row { transition: background 0.1s ease; }
        .flb-fan-row:hover { background: rgba(255,255,255,0.04) !important; }
        .flb-fan-row:active { background: rgba(255,255,255,0.07) !important; }
      `}</style>

      {/* Backdrop */}
      <div style={{ position: "fixed", inset: 0, zIndex: 700, backgroundColor: "rgba(0,0,0,0.65)" }} onMouseDown={onClose} />

      {/* Modal */}
      <div
        ref={modalRef}
        className="flb-modal"
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          position:        "fixed",
          top:             "50%",
          left:            "50%",
          zIndex:          701,
          width:           "min(92vw, 380px)",
          maxHeight:       "min(85vh, 560px)",
          display:         "flex",
          flexDirection:   "column",
          borderRadius:    "18px",
          overflow:        "hidden",
          backgroundColor: "rgba(10,10,18,0.96)",
          border:          "1px solid rgba(255,255,255,0.07)",
          boxShadow:       "0 20px 60px rgba(0,0,0,0.7)",
          fontFamily:      "'Inter', sans-serif",
          backdropFilter:  "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {step === "name" && (
              <button
                onClick={() => setStep("pick")}
                style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", fontSize: "18px", lineHeight: 1, padding: "2px 6px 2px 0", display: "flex" }}
              >
                ‹
              </button>
            )}
            <span style={{ fontSize: "13px", fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
              {step === "pick" ? "Create audience list" : "Name your list"}
            </span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.35)", display: "flex", padding: "4px" }}>
            <X size={16} strokeWidth={1.8} />
          </button>
        </div>

        {/* ── STEP 1: Pick fans ── */}
        {step === "pick" && (
          <>
            {/* Search */}
            <div style={{ padding: "10px 16px 0", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "10px", padding: "8px 12px", border: "1px solid rgba(255,255,255,0.07)" }}>
                <Search size={14} color="rgba(255,255,255,0.3)" strokeWidth={2} />
                <input
                  type="text"
                  placeholder="Search fans…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#FFF", fontSize: "13px", fontFamily: "inherit" }}
                />
                {search && (
                  <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", display: "flex", padding: 0 }}>
                    <X size={12} strokeWidth={2} />
                  </button>
                )}
              </div>
            </div>

            {/* Selected count bar */}
            {selected.size > 0 && (
              <div style={{ padding: "8px 16px 0", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", backgroundColor: "rgba(139,92,246,0.1)", borderRadius: "8px", border: "1px solid rgba(139,92,246,0.2)" }}>
                  <span style={{ fontSize: "12px", color: "#8B5CF6", fontWeight: 600 }}>{selected.size} fan{selected.size !== 1 ? "s" : ""} selected</span>
                  <button onClick={() => setSelected(new Set())} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(139,92,246,0.6)", fontSize: "11px", fontFamily: "inherit", padding: 0 }}>Clear</button>
                </div>
              </div>
            )}

            {/* Fan list */}
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
              {loading ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 0", gap: "10px" }}>
                  <Loader2 size={18} color="#8B5CF6" strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)" }}>Loading fans…</span>
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: "32px 16px", textAlign: "center" }}>
                  <p style={{ margin: 0, fontSize: "13px", color: "rgba(255,255,255,0.3)" }}>
                    {search ? "No fans match your search" : "No fans yet"}
                  </p>
                </div>
              ) : (
                filtered.map((fan) => {
                  const isSelected = selected.has(fan.id);
                  return (
                    <button
                      key={fan.id}
                      className="flb-fan-row"
                      onClick={() => toggle(fan.id)}
                      style={{
                        display:    "flex",
                        alignItems: "center",
                        gap:        "10px",
                        width:      "100%",
                        padding:    "9px 16px",
                        background: isSelected ? "rgba(139,92,246,0.06)" : "none",
                        border:     "none",
                        cursor:     "pointer",
                        fontFamily: "inherit",
                        textAlign:  "left",
                      }}
                    >
                      {/* Checkbox */}
                      <div style={{
                        width:           "20px",
                        height:          "20px",
                        borderRadius:    "50%",
                        border:          isSelected ? "none" : "2px solid rgba(255,255,255,0.18)",
                        backgroundColor: isSelected ? "#8B5CF6" : "transparent",
                        display:         "flex",
                        alignItems:      "center",
                        justifyContent:  "center",
                        flexShrink:      0,
                        transition:      "all 0.15s ease",
                      }}>
                        {isSelected && <Check size={11} color="#FFF" strokeWidth={3} />}
                      </div>

                      {/* Avatar */}
                      <div style={{ width: "34px", height: "34px", borderRadius: "50%", overflow: "hidden", backgroundColor: "#2A2A3D", flexShrink: 0 }}>
                        {fan.avatar_url
                          ? <img src={fan.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700, color: "#8B5CF6" }}>{(fan.display_name || fan.username)[0].toUpperCase()}</div>
                        }
                      </div>

                      {/* Name */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#FFF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {fan.display_name || fan.username}
                        </p>
                        <p style={{ margin: "1px 0 0", fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>@{fan.username}</p>
                      </div>

                      {/* Spend */}
                      {fan.total_spend > 0 && (
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ background: "rgba(34,197,94,0.1)", border: "0.5px solid rgba(34,197,94,0.25)", borderRadius: "6px", padding: "3px 8px" }}>
                            <span style={{ fontSize: "12px", fontWeight: 700, color: "#4ade80" }}>
                              {formatSpend(fan.total_spend)}
                            </span>
                          </div>
                          <p style={{ margin: "3px 0 0", fontSize: "10px", color: "rgba(255,255,255,0.3)", textAlign: "right" }}>
                            total spent
                          </p>
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: "10px 16px 14px", borderTop: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
              {error && <p style={{ margin: "0 0 8px", fontSize: "11px", color: "#EF4444" }}>{error}</p>}
              <button
                onClick={() => { if (selected.size > 0) setStep("name"); }}
                disabled={selected.size === 0}
                style={{
                  width:        "100%",
                  padding:      "13px",
                  borderRadius: "12px",
                  border:       "none",
                  background:   selected.size > 0 ? "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)" : "#1F1F2A",
                  color:        selected.size > 0 ? "#FFF" : "#4A4A6A",
                  fontSize:     "14px",
                  fontWeight:   700,
                  cursor:       selected.size > 0 ? "pointer" : "default",
                  fontFamily:   "inherit",
                  transition:   "all 0.2s ease",
                }}
              >
                {selected.size > 0 ? `Continue with ${selected.size} fan${selected.size !== 1 ? "s" : ""}` : "Select fans to continue"}
              </button>
            </div>
          </>
        )}

        {/* ── STEP 2: Name the list ── */}
        {step === "name" && (
          <>
            <div style={{ flex: 1, padding: "20px 16px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Summary */}
              <div style={{ padding: "12px 14px", backgroundColor: "rgba(139,92,246,0.08)", borderRadius: "12px", border: "1px solid rgba(139,92,246,0.15)" }}>
                <p style={{ margin: 0, fontSize: "13px", color: "#8B5CF6", fontWeight: 600 }}>{selected.size} fan{selected.size !== 1 ? "s" : ""} selected</p>
                <p style={{ margin: "3px 0 0", fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>
                  {fans.filter((f) => selected.has(f.id)).filter((f) => f.total_spend > 0).length} spenders included
                </p>
              </div>

              {/* Name input */}
              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.05em", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
                  List name
                </label>
                <div style={{ display: "flex", alignItems: "center", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "12px", padding: "4px 4px 4px 14px", border: "1px solid rgba(139,92,246,0.3)" }}>
                  <input
                    ref={nameRef}
                    type="text"
                    value={listName}
                    onChange={(e) => setListName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
                    placeholder="e.g. VIP spenders, Top fans…"
                    maxLength={50}
                    style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#FFF", fontSize: "14px", fontFamily: "inherit", padding: "9px 0" }}
                  />
                </div>
              </div>

              {error && <p style={{ margin: 0, fontSize: "11px", color: "#EF4444" }}>{error}</p>}
            </div>

            {/* Footer */}
            <div style={{ padding: "0 16px 16px", flexShrink: 0 }}>
              <button
                onClick={handleSave}
                disabled={!listName.trim() || saving}
                style={{
                  width:        "100%",
                  padding:      "13px",
                  borderRadius: "12px",
                  border:       "none",
                  background:   listName.trim() ? "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)" : "#1F1F2A",
                  color:        listName.trim() ? "#FFF" : "#4A4A6A",
                  fontSize:     "14px",
                  fontWeight:   700,
                  cursor:       listName.trim() && !saving ? "pointer" : "default",
                  fontFamily:   "inherit",
                  transition:   "all 0.2s ease",
                  display:      "flex",
                  alignItems:   "center",
                  justifyContent: "center",
                  gap:          "8px",
                }}
              >
                {saving ? (
                  <>
                    <Loader2 size={14} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />
                    Saving…
                  </>
                ) : "Save list"}
              </button>
            </div>
          </>
        )}
      </div>
    </>,
    document.body!
  );
}