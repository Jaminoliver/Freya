// components/vault/VaultPicker.tsx
"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { X, Image as ImageIcon, Film, Music, Sparkles, Check, Play, Clock, CalendarDays, Copy } from "lucide-react";

export interface VaultItem {
  id:                bigint | number;
  media_type:        "photo" | "video" | "audio" | "gif";
  file_url:          string;
  thumbnail_url:     string | null;
  width:             number | null;
  height:            number | null;
  duration_seconds:  number | null;
  blur_hash:         string | null;
  aspect_ratio:      number | null;
  bunny_video_id:    string | null;
  created_at:        string;
  last_used_at:      string | null;
}

interface Props {
  open:        boolean;
  onClose:     () => void;
  onConfirm:   (items: VaultItem[]) => void;
  multiSelect?: boolean;
  maxItems?:    number;
  filterType?:  "photo" | "video" | "audio" | "gif" | null;
}

type TypeFilter = "all" | "photo" | "video" | "audio" | "gif";
type SortMode   = "recent" | "last_used";

const PAGE_SIZE = 30;

export function VaultPicker({ open, onClose, onConfirm, multiSelect = true, maxItems, filterType = null }: Props) {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!open || isMobile === null) return null;

  return isMobile
    ? <VaultPickerMobile  onClose={onClose} onConfirm={onConfirm} multiSelect={multiSelect} maxItems={maxItems} filterType={filterType} />
    : <VaultPickerDesktop onClose={onClose} onConfirm={onConfirm} multiSelect={multiSelect} maxItems={maxItems} filterType={filterType} />;
}

// ── Shared data hook ──────────────────────────────────────────────────────────
function useVaultData(filterType: TypeFilter | null) {
  const [items,   setItems]   = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [filter,  setFilter]  = useState<TypeFilter>(filterType ?? "all");
  const [sort,    setSort]    = useState<SortMode>("recent");
  const offsetRef = useRef(0);

  // Items sorted client-side so switching sort is instant without refetch
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if (sort === "last_used") {
        const aT = a.last_used_at ?? a.created_at;
        const bT = b.last_used_at ?? b.created_at;
        return new Date(bT).getTime() - new Date(aT).getTime();
      }
      // "recent" — newest created first
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [items, sort]);

  // Detect duplicates: group by file_url; mark all but the newest in each group
  const duplicateIds = useMemo(() => {
    const byUrl = new Map<string, VaultItem[]>();
    for (const item of items) {
      const key = item.file_url;
      if (!byUrl.has(key)) byUrl.set(key, []);
      byUrl.get(key)!.push(item);
    }
    const dupeSet = new Set<number>();
    for (const group of byUrl.values()) {
      if (group.length < 2) continue;
      // Sort by created_at desc; the newest is the "original", rest are dupes
      const sorted = [...group].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      for (let i = 1; i < sorted.length; i++) {
        dupeSet.add(Number(sorted[i].id));
      }
    }
    return dupeSet;
  }, [items]);

  const load = useCallback(async (reset: boolean) => {
    setLoading(true);
    const offset = reset ? 0 : offsetRef.current;
    const params = new URLSearchParams({
      limit:  String(PAGE_SIZE),
      offset: String(offset),
      sort,
    });
    if (filter !== "all") params.set("type", filter);

    try {
      const res  = await fetch(`/api/vault?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setItems(reset ? [] : items);
        setHasMore(false);
      } else {
        const incoming = data.items ?? [];
        setItems(prev => reset ? incoming : [...prev, ...incoming]);
        offsetRef.current = offset + incoming.length;
        setHasMore(!!data.has_more);
      }
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, sort]);

  useEffect(() => {
    offsetRef.current = 0;
    load(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // Re-fetch when sort changes (so server pagination is consistent)
  useEffect(() => {
    offsetRef.current = 0;
    load(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort]);

  return {
    items: sortedItems,
    duplicateIds,
    loading,
    hasMore,
    filter, setFilter,
    sort,   setSort,
    loadMore: () => load(false),
  };
}

// ── Filter chips ──────────────────────────────────────────────────────────────
function FilterChips({ value, onChange, locked }: { value: TypeFilter; onChange: (v: TypeFilter) => void; locked?: boolean }) {
  const filters: { id: TypeFilter; label: string; Icon: any }[] = [
    { id: "all",   label: "All",    Icon: ImageIcon },
    { id: "photo", label: "Photos", Icon: ImageIcon },
    { id: "video", label: "Videos", Icon: Film },
  ];
  return (
    <div style={{ display: "flex", gap: "6px", padding: "10px 14px", overflowX: "auto", scrollbarWidth: "none", flexShrink: 0 }}>
      {filters.map(({ id, label, Icon }) => {
        const active = value === id;
        return (
          <button
            key={id}
            onClick={() => !locked && onChange(id)}
            disabled={!!locked}
            style={{
              display:         "flex",
              alignItems:      "center",
              gap:             "5px",
              padding:         "7px 13px",
              borderRadius:    "20px",
              border:          "none",
              backgroundColor: active ? "#8B5CF6" : "#1A1A2E",
              color:           active ? "#FFFFFF" : "#A3A3C2",
              fontSize:        "13px",
              fontWeight:      600,
              cursor:          locked ? "default" : "pointer",
              opacity:         locked ? 0.5 : 1,
              fontFamily:      "'Inter', sans-serif",
              whiteSpace:      "nowrap",
              flexShrink:      0,
              transition:      "background 0.15s ease",
            }}
          >
            <Icon size={13} strokeWidth={2} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ── Sort toggle ───────────────────────────────────────────────────────────────
function SortToggle({ value, onChange }: { value: SortMode; onChange: (v: SortMode) => void }) {
  return (
    <div style={{
      display:         "flex",
      gap:             "4px",
      padding:         "0 14px 10px",
      flexShrink:      0,
    }}>
      {([
        { id: "recent"    as SortMode, label: "Recently Added", Icon: CalendarDays },
        { id: "last_used" as SortMode, label: "Last Used",       Icon: Clock        },
      ]).map(({ id, label, Icon }) => {
        const active = value === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            style={{
              display:         "flex",
              alignItems:      "center",
              gap:             "5px",
              padding:         "6px 11px",
              borderRadius:    "8px",
              border:          active ? "1px solid #8B5CF6" : "1px solid #1A1A2E",
              backgroundColor: active ? "rgba(139,92,246,0.12)" : "transparent",
              color:           active ? "#A78BFA" : "#5A5A7A",
              fontSize:        "12px",
              fontWeight:      600,
              cursor:          "pointer",
              fontFamily:      "'Inter', sans-serif",
              whiteSpace:      "nowrap",
              transition:      "all 0.15s ease",
            }}
          >
            <Icon size={12} strokeWidth={2} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ── Item tile ─────────────────────────────────────────────────────────────────
function VaultTile({
  item, selected, isDuplicate, onClick,
}: {
  item: VaultItem; selected: boolean; isDuplicate: boolean; onClick: () => void;
}) {
  const isVideo = item.media_type === "video";
  const isAudio = item.media_type === "audio";
  const thumb   = item.thumbnail_url ?? (!isVideo ? item.file_url : null);

  return (
    <button
      onClick={onClick}
      style={{
        position:        "relative",
        width:           "100%",
        aspectRatio:     "1 / 1",
        borderRadius:    "10px",
        overflow:        "hidden",
        border:          "none",
        padding:         0,
        cursor:          "pointer",
        backgroundColor: isAudio ? "#1A1A2E" : "#0D0D18",
        outline:         selected   ? "2.5px solid #8B5CF6"
                       : isDuplicate ? "2px solid rgba(234,179,8,0.5)"
                       : "none",
        outlineOffset:   selected || isDuplicate ? "-2px" : "0",
        transition:      "transform 0.1s ease",
      }}
      onMouseDown={(e)  => { e.currentTarget.style.transform = "scale(0.97)"; }}
      onMouseUp={(e)    => { e.currentTarget.style.transform = "scale(1)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
    >
      {isAudio ? (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#8B5CF6" }}>
          <Music size={32} strokeWidth={1.6} />
        </div>
      ) : thumb ? (
        <img
          src={thumb}
          alt=""
          loading="lazy"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        />
      ) : (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#8B5CF6" }}>
          <Film size={32} strokeWidth={1.6} />
        </div>
      )}

      {/* Video play badge */}
      {isVideo && (
        <div style={{
          position:        "absolute",
          top:             "6px",
          right:           "6px",
          width:           "22px",
          height:          "22px",
          borderRadius:    "50%",
          backgroundColor: "rgba(0,0,0,0.55)",
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
          color:           "#FFF",
        }}>
          <Play size={11} strokeWidth={2.5} fill="currentColor" />
        </div>
      )}

      {/* Duplicate badge */}
      {isDuplicate && !selected && (
        <div style={{
          position:        "absolute",
          top:             "6px",
          left:            "6px",
          display:         "flex",
          alignItems:      "center",
          gap:             "3px",
          padding:         "3px 6px",
          borderRadius:    "6px",
          backgroundColor: "rgba(234,179,8,0.85)",
          color:           "#000",
          fontSize:        "9px",
          fontWeight:      800,
          letterSpacing:   "0.03em",
          fontFamily:      "'Inter', sans-serif",
          backdropFilter:  "blur(4px)",
        }}>
          <Copy size={8} strokeWidth={3} />
          DUP
        </div>
      )}

      {/* Selection checkmark */}
      {selected && (
        <div style={{
          position:        "absolute",
          top:             "6px",
          left:            "6px",
          width:           "22px",
          height:          "22px",
          borderRadius:    "50%",
          backgroundColor: "#8B5CF6",
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
          color:           "#FFF",
          boxShadow:       "0 0 0 2px #0A0A0F",
        }}>
          <Check size={13} strokeWidth={3} />
        </div>
      )}
    </button>
  );
}

// ── Duplicate summary banner ──────────────────────────────────────────────────
function DuplicateBanner({ count, onDismiss }: { count: number; onDismiss: () => void }) {
  if (count === 0) return null;
  return (
    <div style={{
      display:         "flex",
      alignItems:      "center",
      justifyContent:  "space-between",
      margin:          "0 14px 8px",
      padding:         "8px 12px",
      borderRadius:    "10px",
      backgroundColor: "rgba(234,179,8,0.1)",
      border:          "1px solid rgba(234,179,8,0.25)",
      flexShrink:      0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
        <Copy size={13} strokeWidth={2.5} color="#EAB308" />
        <span style={{ fontSize: "12px", color: "#EAB308", fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
          {count} duplicate {count === 1 ? "file" : "files"} detected
        </span>
      </div>
      <button
        onClick={onDismiss}
        style={{ background: "none", border: "none", cursor: "pointer", color: "#EAB308", opacity: 0.7, padding: "0 2px", display: "flex" }}
      >
        <X size={13} strokeWidth={2.5} />
      </button>
    </div>
  );
}

// ── Mobile (bottom sheet) ─────────────────────────────────────────────────────
function VaultPickerMobile({ onClose, onConfirm, multiSelect, maxItems, filterType }: Omit<Props, "open">) {
  const { items, duplicateIds, loading, hasMore, filter, setFilter, sort, setSort, loadMore } = useVaultData(filterType ?? null);
  const [selected, setSelected] = useState<Map<number, VaultItem>>(new Map());
  const [hideDupeBanner, setHideDupeBanner] = useState(false);

  const toggleSelect = (item: VaultItem) => {
    const id  = Number(item.id);
    const map = new Map(selected);
    if (map.has(id)) {
      map.delete(id);
    } else {
      if (!multiSelect) map.clear();
      if (maxItems && map.size >= maxItems) return;
      map.set(id, item);
    }
    setSelected(map);
  };

  const confirm = () => {
    if (selected.size === 0) return;
    onConfirm(Array.from(selected.values()));
    onClose();
  };

  return (
    <>
      <Styles />
      <div onClick={onClose} className="vp-backdrop" style={{ position: "fixed", inset: 0, zIndex: 999, backgroundColor: "rgba(0,0,0,0.55)", animation: "vpFade 0.18s ease" }} />
      <div className="vp-sheet" style={{
        position:             "fixed",
        bottom:               0,
        left:                 0,
        right:                0,
        zIndex:               1000,
        backgroundColor:      "#0A0A0F",
        borderTopLeftRadius:  "20px",
        borderTopRightRadius: "20px",
        maxHeight:            "85dvh",
        display:              "flex",
        flexDirection:        "column",
        animation:            "vpSlideUp 0.25s cubic-bezier(0.32, 0.72, 0, 1)",
        paddingBottom:        "env(safe-area-inset-bottom, 0px)",
        fontFamily:           "'Inter', sans-serif",
      }}>
        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "8px 0" }}>
          <div style={{ width: "36px", height: "4px", borderRadius: "2px", backgroundColor: "#2A2A3D" }} />
        </div>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 16px 12px", flexShrink: 0 }}>
          <span style={{ fontSize: "17px", fontWeight: 700, color: "#FFFFFF" }}>Vault</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#A3A3C2", padding: "6px", display: "flex" }}>
            <X size={20} strokeWidth={1.8} />
          </button>
        </div>

        <FilterChips value={filter} onChange={setFilter} locked={!!filterType} />
        <SortToggle value={sort} onChange={setSort} />

        {!hideDupeBanner && (
          <DuplicateBanner count={duplicateIds.size} onDismiss={() => setHideDupeBanner(true)} />
        )}

        {/* Grid */}
        <div
          style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain", padding: "8px 12px 16px" }}
          onScroll={(e) => {
            const el = e.currentTarget;
            if (el.scrollHeight - el.scrollTop - el.clientHeight < 200 && hasMore && !loading) loadMore();
          }}
        >
          {items.length === 0 && !loading ? (
            <EmptyState />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
              {items.map((item) => (
                <VaultTile
                  key={Number(item.id)}
                  item={item}
                  selected={selected.has(Number(item.id))}
                  isDuplicate={duplicateIds.has(Number(item.id))}
                  onClick={() => toggleSelect(item)}
                />
              ))}
            </div>
          )}
          {loading && (
            <div style={{ display: "flex", justifyContent: "center", padding: "16px 0" }}>
              <Spinner />
            </div>
          )}
        </div>

        {/* Send CTA */}
        <div style={{ padding: "10px 14px 12px", borderTop: "1px solid #1A1A2A", flexShrink: 0 }}>
          <button
            onClick={confirm}
            disabled={selected.size === 0}
            style={{
              width:        "100%",
              padding:      "13px 0",
              borderRadius: "12px",
              border:       "none",
              background:   selected.size > 0 ? "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)" : "#1A1A2E",
              color:        selected.size > 0 ? "#FFF" : "#4A4A6A",
              fontSize:     "15px",
              fontWeight:   700,
              cursor:       selected.size > 0 ? "pointer" : "default",
              fontFamily:   "inherit",
              transition:   "background 0.15s ease",
            }}
          >
            {selected.size === 0 ? "Select items" : `Add ${selected.size} ${selected.size === 1 ? "item" : "items"}`}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Desktop (modal) ───────────────────────────────────────────────────────────
function VaultPickerDesktop({ onClose, onConfirm, multiSelect, maxItems, filterType }: Omit<Props, "open">) {
  const { items, duplicateIds, loading, hasMore, filter, setFilter, sort, setSort, loadMore } = useVaultData(filterType ?? null);
  const [selected, setSelected] = useState<Map<number, VaultItem>>(new Map());
  const [hideDupeBanner, setHideDupeBanner] = useState(false);

  const toggleSelect = (item: VaultItem) => {
    const id  = Number(item.id);
    const map = new Map(selected);
    if (map.has(id)) {
      map.delete(id);
    } else {
      if (!multiSelect) map.clear();
      if (maxItems && map.size >= maxItems) return;
      map.set(id, item);
    }
    setSelected(map);
  };

  const confirm = () => {
    if (selected.size === 0) return;
    onConfirm(Array.from(selected.values()));
    onClose();
  };

  return (
    <>
      <Styles />
      <div
        onClick={onClose}
        style={{
          position:        "fixed",
          inset:           0,
          zIndex:          999,
          backgroundColor: "rgba(0,0,0,0.65)",
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
          animation:       "vpFade 0.18s ease",
          fontFamily:      "'Inter', sans-serif",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width:           "min(720px, 90vw)",
            height:          "min(720px, 85vh)",
            backgroundColor: "#0A0A0F",
            borderRadius:    "16px",
            border:          "1px solid #1A1A2A",
            display:         "flex",
            flexDirection:   "column",
            overflow:        "hidden",
            animation:       "vpZoomIn 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #1A1A2A", flexShrink: 0 }}>
            <span style={{ fontSize: "17px", fontWeight: 700, color: "#FFFFFF" }}>Vault</span>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#A3A3C2", padding: "6px", display: "flex" }}>
              <X size={20} strokeWidth={1.8} />
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingRight: "14px", flexShrink: 0 }}>
            <FilterChips value={filter} onChange={setFilter} locked={!!filterType} />
            <SortToggle value={sort} onChange={setSort} />
          </div>

          {!hideDupeBanner && (
            <DuplicateBanner count={duplicateIds.size} onDismiss={() => setHideDupeBanner(true)} />
          )}

          {/* Grid */}
          <div
            style={{ flex: 1, overflowY: "auto", padding: "8px 16px 16px" }}
            onScroll={(e) => {
              const el = e.currentTarget;
              if (el.scrollHeight - el.scrollTop - el.clientHeight < 200 && hasMore && !loading) loadMore();
            }}
          >
            {items.length === 0 && !loading ? (
              <EmptyState />
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
                {items.map((item) => (
                  <VaultTile
                    key={Number(item.id)}
                    item={item}
                    selected={selected.has(Number(item.id))}
                    isDuplicate={duplicateIds.has(Number(item.id))}
                    onClick={() => toggleSelect(item)}
                  />
                ))}
              </div>
            )}
            {loading && (
              <div style={{ display: "flex", justifyContent: "center", padding: "16px 0" }}>
                <Spinner />
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderTop: "1px solid #1A1A2A", flexShrink: 0 }}>
            <span style={{ fontSize: "13px", color: "#6B6B8A" }}>
              {selected.size > 0 ? `${selected.size} selected` : "No selection"}
              {duplicateIds.size > 0 && !hideDupeBanner && (
                <span style={{ marginLeft: "10px", color: "#EAB308", fontWeight: 600 }}>
                  · {duplicateIds.size} dup{duplicateIds.size === 1 ? "" : "s"}
                </span>
              )}
            </span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={onClose}
                style={{
                  padding:      "10px 18px",
                  borderRadius: "10px",
                  border:       "1px solid #2A2A3D",
                  background:   "transparent",
                  color:        "#A3A3C2",
                  fontSize:     "13px",
                  fontWeight:   600,
                  cursor:       "pointer",
                  fontFamily:   "inherit",
                }}
              >Cancel</button>
              <button
                onClick={confirm}
                disabled={selected.size === 0}
                style={{
                  padding:      "10px 18px",
                  borderRadius: "10px",
                  border:       "none",
                  background:   selected.size > 0 ? "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)" : "#1A1A2E",
                  color:        selected.size > 0 ? "#FFF" : "#4A4A6A",
                  fontSize:     "13px",
                  fontWeight:   700,
                  cursor:       selected.size > 0 ? "pointer" : "default",
                  fontFamily:   "inherit",
                }}
              >
                Add {selected.size > 0 ? `${selected.size} item${selected.size === 1 ? "" : "s"}` : ""}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 16px", gap: "12px", color: "#4A4A6A" }}>
      <Sparkles size={36} strokeWidth={1.4} color="#8B5CF6" />
      <span style={{ fontSize: "14px", color: "#A3A3C2", fontWeight: 600 }}>Your vault is empty</span>
      <span style={{ fontSize: "12px", color: "#4A4A6A", textAlign: "center", maxWidth: "260px", lineHeight: 1.5 }}>
        Media you upload to posts, messages, or directly to your vault will appear here.
      </span>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{
      width:          "20px",
      height:         "20px",
      borderRadius:   "50%",
      border:         "2px solid #2A2A3D",
      borderTopColor: "#8B5CF6",
      animation:      "vpSpin 0.7s linear infinite",
    }} />
  );
}

function Styles() {
  return (
    <style>{`
      @keyframes vpFade    { from { opacity: 0; }             to { opacity: 1; }            }
      @keyframes vpSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      @keyframes vpZoomIn  { from { opacity: 0; transform: scale(0.94); } to { opacity: 1; transform: scale(1); } }
      @keyframes vpSpin    { to   { transform: rotate(360deg); }          }
    `}</style>
  );
}