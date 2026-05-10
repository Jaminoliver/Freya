"use client";

import { useState, useEffect } from "react";
import { X, Check, Plus, Trash2, Loader2 } from "lucide-react";
import type { CustomAudienceFilter } from "@/lib/mass-message/audienceResolver";

export type Segment =
  | "all_subscribers"
  | "active_subscribers"
  | "expired_subscribers"
  | "online_now"
  | "top_spenders"
  | "new_this_week"
  | "followers"
  | "custom"
  | `fan_list:${number}`;

export const SEGMENT_LABEL: Record<Exclude<Segment, "custom" | `fan_list:${number}`>, string> = {
  all_subscribers:     "All subscribers",
  active_subscribers:  "Active subscribers",
  expired_subscribers: "Expired subscribers",
  online_now:          "Online now",
  top_spenders:        "Top spenders",
  new_this_week:       "New this week",
  followers:           "Followers",
};

const SEGMENTS: { id: Exclude<Segment, "custom" | `fan_list:${number}`>; label: string; sub: string }[] = [
  { id: "active_subscribers",  label: "Active subscribers",  sub: "Currently subscribed fans" },
  { id: "all_subscribers",     label: "All subscribers",     sub: "Active + grace period" },
  { id: "expired_subscribers", label: "Expired subscribers", sub: "Re-engage lapsed fans" },
  { id: "online_now",          label: "Online now",          sub: "Active in last 5 minutes" },
  { id: "top_spenders",        label: "Top spenders",        sub: "Fans who've spent ₦5,000+" },
  { id: "new_this_week",       label: "New this week",       sub: "Subscribed in last 7 days" },
  { id: "followers",           label: "Followers",           sub: "Free followers" },
];

interface FanList {
  id:           number;
  name:         string;
  member_count: number;
  fan_ids:      string[];
}

interface AudienceSheetProps {
  value:                  Segment;
  onChange:               (seg: Segment) => void;
  onClose:                () => void;
  counts?:                Partial<Record<string, number>>;
  excluded?:              Partial<Record<string, number>>;
  countsLoading?:         boolean;
  customFilter:           CustomAudienceFilter;
  onCustomFilterChange:   (f: CustomAudienceFilter) => void;
  customCount:            { count: number; matched: number; excluded: number } | null;
  customCountLoading:     boolean;
  onOpenListBuilder:      () => void;
}

export function AudienceSheet({
  value,
  onChange,
  onClose,
  counts = {},
  excluded = {},
  countsLoading = false,
  onOpenListBuilder,
}: AudienceSheetProps) {
  const [tab,          setTab]          = useState<"presets" | "lists">(value.startsWith("fan_list:") ? "lists" : "presets");
  const [fanLists,     setFanLists]     = useState<FanList[]>([]);
  const [listsLoading, setListsLoading] = useState(true);
  const [deleting,     setDeleting]     = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch("/api/fan-lists")
      .then((r) => r.json())
      .then((data) => setFanLists(data.lists ?? []))
      .catch(() => {})
      .finally(() => setListsLoading(false));
  }, []);

  const handleDeleteList = async (e: React.MouseEvent, listId: number) => {
    e.stopPropagation();
    if (deleting.has(listId)) return;
    setDeleting((prev) => new Set(prev).add(listId));
    try {
      await fetch(`/api/fan-lists/${listId}`, { method: "DELETE" });
      setFanLists((prev) => prev.filter((l) => l.id !== listId));
      if (value === `fan_list:${listId}`) onChange("active_subscribers");
    } catch {}
    setDeleting((prev) => { const n = new Set(prev); n.delete(listId); return n; });
  };

  const tabBtn = (t: "presets" | "lists", label: string) => (
    <button
      onClick={() => setTab(t)}
      style={{
        flex:         1,
        padding:      "10px 0",
        background:   "none",
        border:       "none",
        borderBottom: `2px solid ${tab === t ? "#8B5CF6" : "transparent"}`,
        color:        tab === t ? "#FFFFFF" : "#6B6B8A",
        fontSize:     "14px",
        fontWeight:   700,
        cursor:       "pointer",
        fontFamily:   "inherit",
        transition:   "all 0.15s ease",
      }}
    >
      {label}
    </button>
  );

  return (
    <>
      <div onClick={onClose} className="mm-backdrop" />
      <div className="mm-sheet" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)", display: "flex", flexDirection: "column", maxHeight: "85vh" }}>

        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "8px 0", flexShrink: 0 }}>
          <div style={{ width: "36px", height: "4px", borderRadius: "2px", backgroundColor: "#2A2A3D" }} />
        </div>

        {/* Title + close */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 16px 0", flexShrink: 0 }}>
          <span style={{ fontSize: "16px", fontWeight: 700, color: "#FFFFFF" }}>Audience</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#A3A3C2", padding: "6px", display: "flex" }}>
            <X size={20} strokeWidth={1.8} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #1A1A2A", flexShrink: 0 }}>
          {tabBtn("presets", "Presets")}
          {tabBtn("lists", "My lists")}
        </div>

        {/* ── PRESETS TAB ── */}
        {tab === "presets" && (
          <div style={{ overflowY: "auto", flex: 1 }}>
            {SEGMENTS.map(({ id, label, sub }) => {
              const active = value === id;
              return (
                <button
                  key={id}
                  onClick={() => { onChange(id); onClose(); }}
                  style={{
                    width:        "100%",
                    display:      "flex",
                    alignItems:   "center",
                    gap:          "12px",
                    padding:      "14px 16px",
                    background:   active ? "rgba(139,92,246,0.08)" : "transparent",
                    border:       "none",
                    borderBottom: "1px solid #1A1A2A",
                    cursor:       "pointer",
                    textAlign:    "left",
                    fontFamily:   "inherit",
                  }}
                >
                  <div style={{
                    width: "20px", height: "20px", borderRadius: "50%",
                    border: active ? "none" : "2px solid #2A2A3D",
                    backgroundColor: active ? "#8B5CF6" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    {active && <Check size={12} color="#FFF" strokeWidth={3} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "14px", color: "#FFF", fontWeight: 600 }}>{label}</div>
                    <div style={{ fontSize: "12px", color: "#6B6B8A", marginTop: "2px" }}>{sub}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0 }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: countsLoading ? "#4A4A6A" : (counts[id] ?? 0) > 0 ? "#8B5CF6" : "#4A4A6A", minWidth: "28px", textAlign: "right" }}>
                      {countsLoading ? "…" : (counts[id] ?? 0).toLocaleString()}
                    </div>
                    {!countsLoading && (excluded[id] ?? 0) > 0 && (
                      <div style={{ fontSize: "10px", color: "#6B6B8A", textAlign: "right" }}>{excluded[id]} excluded</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* ── LISTS TAB ── */}
        {tab === "lists" && (
          <>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {listsLoading ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 0", gap: "10px" }}>
                  <Loader2 size={18} color="#8B5CF6" strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  <span style={{ fontSize: "13px", color: "#6B6B8A" }}>Loading lists…</span>
                </div>
              ) : fanLists.length === 0 ? (
                <div style={{ padding: "40px 24px", textAlign: "center" }}>
                  <p style={{ margin: "0 0 6px", fontSize: "14px", color: "#FFF", fontWeight: 600 }}>No lists yet</p>
                  <p style={{ margin: 0, fontSize: "13px", color: "#6B6B8A", lineHeight: 1.5 }}>Create a list to target specific fans by name</p>
                </div>
              ) : (
                fanLists.map((list) => {
                  const seg = `fan_list:${list.id}` as Segment;
                  const active = value === seg;
                  const isDeleting = deleting.has(list.id);
                  return (
                    <button
                      key={list.id}
                      onClick={() => { onChange(seg); onClose(); }}
                      disabled={isDeleting}
                      style={{
                        width:        "100%",
                        display:      "flex",
                        alignItems:   "center",
                        gap:          "12px",
                        padding:      "14px 16px",
                        background:   active ? "rgba(139,92,246,0.08)" : "transparent",
                        border:       "none",
                        borderBottom: "1px solid #1A1A2A",
                        cursor:       isDeleting ? "default" : "pointer",
                        textAlign:    "left",
                        fontFamily:   "inherit",
                        opacity:      isDeleting ? 0.5 : 1,
                      }}
                    >
                      <div style={{
                        width: "20px", height: "20px", borderRadius: "50%",
                        border: active ? "none" : "2px solid #2A2A3D",
                        backgroundColor: active ? "#8B5CF6" : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>
                        {active && <Check size={12} color="#FFF" strokeWidth={3} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "14px", color: "#FFF", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{list.name}</div>
                        <div style={{ fontSize: "12px", color: "#6B6B8A", marginTop: "2px" }}>{list.member_count} {list.member_count === 1 ? "fan" : "fans"}</div>
                      </div>
                      <div
                        onClick={(e) => handleDeleteList(e, list.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#4A4A6A", display: "flex", padding: "4px", flexShrink: 0 }}
                      >
                        {isDeleting
                          ? <Loader2 size={14} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />
                          : <Trash2 size={14} strokeWidth={1.8} />
                        }
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Create list button */}
            <div style={{ padding: "12px 16px 14px", borderTop: "1px solid #1A1A2A", flexShrink: 0 }}>
              <button
                onClick={() => { onClose(); onOpenListBuilder(); }}
                style={{
                  width:          "100%",
                  padding:        "13px",
                  borderRadius:   "12px",
                  border:         "1.5px solid rgba(139,92,246,0.3)",
                  background:     "rgba(139,92,246,0.08)",
                  color:          "#8B5CF6",
                  fontSize:       "14px",
                  fontWeight:     700,
                  cursor:         "pointer",
                  fontFamily:     "inherit",
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "center",
                  gap:            "6px",
                  transition:     "all 0.15s ease",
                }}
              >
                <Plus size={15} strokeWidth={2.5} />
                Create new list
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}