"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, Image as ImageIcon, Lock, Calendar, X, Users, Clock, Upload } from "lucide-react";
import { VaultPicker } from "@/components/vault/VaultPicker";

import { MassMessageStyles }            from "@/components/messages/mass-messages/Styles";
import { ToolbarBtn }                   from "@/components/messages/mass-messages/ToolbarBtn";
import { PreviewBubble, type VaultItemWithPreview } from "@/components/messages/mass-messages/PreviewBubble";
import { AudienceSheet, SEGMENT_LABEL } from "@/components/messages/mass-messages/AudienceSheet";
import { ScheduleSheet }                from "@/components/messages/mass-messages/ScheduleSheet";
import type { Segment }                 from "@/components/messages/mass-messages/AudienceSheet";



function mergeUnique(a: VaultItemWithPreview[], b: VaultItemWithPreview[]): VaultItemWithPreview[] {
  const seen = new Set(a.map((x) => Number(x.id)));
  const out  = [...a];
  for (const item of b) {
    if (!seen.has(Number(item.id))) {
      out.push(item);
      seen.add(Number(item.id));
    }
  }
  return out;
}

function formatScheduledShort(d: Date): string {
  const now      = new Date();
  const sameDay  = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
  if (sameDay)    return `Today ${time}`;
  if (isTomorrow) return `Tomorrow ${time}`;
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) + ` ${time}`;
}

export default function MassMessageComposePage() {
  const router = useRouter();

  const [text,                  setText]                  = useState("");
  const [selected,              setSelected]              = useState<VaultItemWithPreview[]>([]);
  const [segment,               setSegment]               = useState<Segment>("active_subscribers");
  const [excludeActiveChatters, setExcludeActiveChatters] = useState(true);
  const [scheduledFor,          setScheduledFor]          = useState<Date | null>(null);
  const [isPPV,                 setIsPPV]                 = useState(false);
  const [ppvPrice,              setPpvPrice]              = useState("");
  const [audienceCount,         setAudienceCount]         = useState<number | null>(null);
  const [countLoading,          setCountLoading]          = useState(false);
  const [vaultOpen,             setVaultOpen]             = useState(false);
  const [audienceOpen,          setAudienceOpen]          = useState(false);
  const [scheduleOpen,          setScheduleOpen]          = useState(false);
  const [sending,               setSending]               = useState(false);
  const [error,                 setError]                 = useState<string | null>(null);
  const [uploading,             setUploading]             = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Upload from device ─────────────────────────────────────────────────────
  const handleUploadFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);

    // 1. Optimistic: show instant local previews immediately
    const tempItems: VaultItemWithPreview[] = Array.from(files).map((f, i) => ({
      id:               BigInt(-(Date.now() + i)),       // temporary negative id
      media_type:       f.type.startsWith("video") ? "video" : "photo",
      file_url:         "",
      thumbnail_url:    null,
      width:            null,
      height:           null,
      duration_seconds: null,
      blur_hash:        null,
      aspect_ratio:     null,
      bunny_video_id:   null,
      created_at:       new Date().toISOString(),
      last_used_at:     null,
      objectURL:        URL.createObjectURL(f),
    }));
    setSelected((prev) => mergeUnique(prev, tempItems));

    try {
      const fd = new FormData();
      for (const f of Array.from(files)) fd.append("file", f);
      const res  = await fetch("/api/upload/photo", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      const realItems: VaultItemWithPreview[] = (data.results ?? [])
        .filter((r: any) => r.vaultItemId)
        .map((r: any) => ({
          id:               r.vaultItemId,
          media_type:       r.mediaType,
          file_url:         r.url,
          thumbnail_url:    null,
          width:            null,
          height:           null,
          duration_seconds: null,
          blur_hash:        null,
          aspect_ratio:     null,
          bunny_video_id:   null,
          created_at:       new Date().toISOString(),
          last_used_at:     null,
        }));

      // 2. Replace temp items with real ones
      setSelected((prev) => {
        const tempIds = new Set(tempItems.map((t) => Number(t.id)));
        const withoutTemps = prev.filter((v) => !tempIds.has(Number(v.id)));
        // Revoke object URLs to free memory
        tempItems.forEach((t) => t.objectURL && URL.revokeObjectURL(t.objectURL));
        return mergeUnique(withoutTemps, realItems);
      });
    } catch (err: any) {
      // Remove temp items on failure
      setSelected((prev) => {
        const tempIds = new Set(tempItems.map((t) => Number(t.id)));
        tempItems.forEach((t) => t.objectURL && URL.revokeObjectURL(t.objectURL));
        return prev.filter((v) => !tempIds.has(Number(v.id)));
      });
      setError(err?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }, []);

  // ── Live audience count ────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setCountLoading(true);
    fetch("/api/mass-messages/audience-count", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ audience_segment: segment, exclude_active_chatters: excludeActiveChatters }),
    })
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setAudienceCount(data.count ?? 0); })
      .catch(() => { if (!cancelled) setAudienceCount(0); })
      .finally(() => { if (!cancelled) setCountLoading(false); });
    return () => { cancelled = true; };
  }, [segment, excludeActiveChatters]);

  // ── Validation ─────────────────────────────────────────────────────────────
  const hasContent = text.trim().length > 0 || selected.length > 0;
  const ppvValid   = !isPPV || (selected.length > 0 && Number(ppvPrice) >= 100);
  const canSend    = hasContent && ppvValid && (audienceCount ?? 0) > 0 && !sending;

  // ── Send ───────────────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    if (!canSend) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/mass-messages", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text:                    text.trim() || null,
          ppv_price_kobo:          isPPV ? Math.round(Number(ppvPrice) * 100) : null,
          audience_segment:        segment,
          exclude_active_chatters: excludeActiveChatters,
          scheduled_for:           scheduledFor ? scheduledFor.toISOString() : null,
          vault_item_ids:          selected.filter((v) => Number(v.id) > 0).map((v) => Number(v.id)),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      router.push("/messages");
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong");
      setSending(false);
    }
  }, [canSend, text, isPPV, ppvPrice, segment, excludeActiveChatters, scheduledFor, selected, router]);

  const removeSelected = (id: number | bigint) => {
    setSelected((prev) => {
      const item = prev.find((v) => Number(v.id) === Number(id));
      if (item?.objectURL) URL.revokeObjectURL(item.objectURL);
      return prev.filter((v) => Number(v.id) !== Number(id));
    });
  };

  const sendLabel = scheduledFor ? "Schedule" : sending ? "Sending…" : "Send";

  return (
    <>
      <MassMessageStyles />

      {/* ── Scrollable page wrapper ─────────────────────────────────────────── */}
      <div style={{
        maxWidth:        "680px",
        margin:          "0 auto",
        backgroundColor: "#0A0A0F",
        fontFamily:      "'Inter', sans-serif",
        minHeight:       "100dvh",
        overflowY:       "auto",
        paddingBottom:   "calc(env(safe-area-inset-bottom, 0px) + 24px)",
      }}>
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{
          position:             "sticky",
          top:                  0,
          zIndex:               20,
          backgroundColor:      "rgba(10,10,15,0.92)",
          backdropFilter:       "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          padding:              "12px 16px",
          paddingTop:           "calc(12px + env(safe-area-inset-top, 0px))",
          display:              "flex",
          alignItems:           "center",
          justifyContent:       "space-between",
          borderBottom:         "1px solid #1F1F2A",
        }}>
          <button
            onClick={() => router.back()}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#D4D4E8", display: "flex", padding: "4px" }}
          >
            <ArrowLeft size={24} strokeWidth={2} />
          </button>
          <span style={{ fontSize: "17px", fontWeight: 700, color: "#FFFFFF" }}>Mass message</span>
          <button
            onClick={handleSend}
            disabled={!canSend}
            style={{
              padding:      "8px 18px",
              borderRadius: "20px",
              border:       "none",
              background:   canSend ? "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)" : "#1F1F2A",
              color:        canSend ? "#FFFFFF" : "#4A4A6A",
              fontSize:     "14px",
              fontWeight:   700,
              cursor:       canSend ? "pointer" : "default",
              fontFamily:   "inherit",
              transition:   "background 0.15s ease",
            }}
          >
            {sendLabel}
          </button>
        </div>

        {/* ── Audience chip ────────────────────────────────────────────────── */}
        <div style={{ padding: "14px 16px 8px", display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
          <span style={{ fontSize: "13px", color: "#6B6B8A", fontWeight: 600 }}>To:</span>
          <button
            onClick={() => setAudienceOpen(true)}
            style={{
              display:      "flex",
              alignItems:   "center",
              gap:          "6px",
              padding:      "7px 12px",
              borderRadius: "20px",
              border:       "1px solid #2A2A3D",
              background:   "#1A1A2E",
              color:        "#FFFFFF",
              fontSize:     "13px",
              fontWeight:   600,
              cursor:       "pointer",
              fontFamily:   "inherit",
            }}
          >
            <Users size={13} strokeWidth={2} color="#8B5CF6" />
            {SEGMENT_LABEL[segment]}
            <ChevronDown size={13} strokeWidth={2} color="#8A8AA0" />
          </button>
          <span style={{
            fontSize:   "12px",
            color:      (audienceCount ?? 0) > 0 ? "#8B5CF6" : "#EF4444",
            fontWeight: 600,
            opacity:    countLoading ? 0.5 : 1,
            transition: "opacity 0.15s ease",
          }}>
            {countLoading ? "…" : `${audienceCount ?? 0} ${(audienceCount ?? 0) === 1 ? "fan" : "fans"}`}
          </span>

          {scheduledFor && (
            <button
              onClick={() => setScheduleOpen(true)}
              style={{
                display:      "flex",
                alignItems:   "center",
                gap:          "5px",
                padding:      "7px 12px",
                borderRadius: "20px",
                border:       "1px solid rgba(139,92,246,0.4)",
                background:   "rgba(139,92,246,0.12)",
                color:        "#8B5CF6",
                fontSize:     "12px",
                fontWeight:   600,
                cursor:       "pointer",
                fontFamily:   "inherit",
                marginLeft:   "auto",
              }}
            >
              <Clock size={12} strokeWidth={2} />
              {formatScheduledShort(scheduledFor)}
              <X size={12} strokeWidth={2.5} onClick={(e) => { e.stopPropagation(); setScheduledFor(null); }} />
            </button>
          )}
        </div>

        {/* ── Live preview ─────────────────────────────────────────────────── */}
        <div style={{ padding: "8px 16px 12px" }}>
          <div style={{ fontSize: "11px", color: "#4A4A6A", marginBottom: "6px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Preview</div>
          <PreviewBubble text={text} media={selected} isPPV={isPPV} ppvPrice={ppvPrice} />
        </div>

        {/* ── Composer ─────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", padding: "0 16px 16px", gap: "12px" }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your message…"
            rows={4}
            style={{
              width:           "100%",
              backgroundColor: "#0D0D18",
              border:          "1px solid #1F1F2A",
              borderRadius:    "14px",
              padding:         "14px",
              color:           "#FFFFFF",
              fontSize:        "16px",
              lineHeight:      1.5,
              resize:          "none",
              fontFamily:      "inherit",
              outline:         "none",
              caretColor:      "#8B5CF6",
            }}
          />

          {/* Selected media thumbnails */}
          {selected.length > 0 && (
            <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
              {selected.map((v) => {
                const src = v.objectURL ?? v.thumbnail_url ?? v.file_url ?? null;
                return (
                  <div key={Number(v.id)} style={{ position: "relative", width: "72px", height: "72px", flexShrink: 0, borderRadius: "10px", overflow: "hidden", backgroundColor: "#1A1A2E" }}>
                    {src && <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                    <button
                      onClick={() => removeSelected(v.id)}
                      style={{
                        position:        "absolute",
                        top:             "4px",
                        right:           "4px",
                        width:           "20px",
                        height:          "20px",
                        borderRadius:    "50%",
                        backgroundColor: "rgba(0,0,0,0.7)",
                        border:          "none",
                        color:           "#FFF",
                        cursor:          "pointer",
                        display:         "flex",
                        alignItems:      "center",
                        justifyContent:  "center",
                        padding:         0,
                      }}
                    >
                      <X size={11} strokeWidth={2.5} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* PPV price input */}
          {isPPV && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", backgroundColor: "#1A1A2E", borderRadius: "10px" }}>
              <span style={{ color: "#9090B0", fontSize: "15px", fontWeight: 600 }}>₦</span>
              <input
                type="number"
                inputMode="numeric"
                min="100"
                max="50000"
                value={ppvPrice}
                onChange={(e) => setPpvPrice(e.target.value)}
                placeholder="Set price"
                style={{
                  flex:       1,
                  background: "transparent",
                  border:     "none",
                  outline:    "none",
                  color:      "#FFFFFF",
                  fontSize:   "16px",
                  fontFamily: "inherit",
                  caretColor: "#8B5CF6",
                }}
              />
              {selected.length === 0 && (
                <span style={{ fontSize: "11px", color: "#EF4444" }}>Add media first</span>
              )}
            </div>
          )}

          {/* Toolbar */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={(e) => { handleUploadFiles(e.target.files); e.target.value = ""; }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap" }}>
            <ToolbarBtn
              icon={<ImageIcon size={20} strokeWidth={1.8} />}
              active={selected.length > 0}
              label={selected.length > 0 ? `${selected.length}` : undefined}
              onClick={() => setVaultOpen(true)}
            />
            <ToolbarBtn
              icon={<Upload size={19} strokeWidth={1.8} />}
              active={uploading}
              label={uploading ? "…" : undefined}
              onClick={() => fileInputRef.current?.click()}
            />
            <ToolbarBtn
              icon={<Lock size={19} strokeWidth={1.8} />}
              active={isPPV}
              onClick={() => setIsPPV((v) => !v)}
            />
            <ToolbarBtn
              icon={<Calendar size={19} strokeWidth={1.8} />}
              active={!!scheduledFor}
              onClick={() => setScheduleOpen(true)}
            />
          </div>

          {error && (
            <div style={{ padding: "10px 14px", borderRadius: "10px", backgroundColor: "rgba(239,68,68,0.08)", color: "#EF4444", fontSize: "13px" }}>
              {error}
            </div>
          )}
        </div>
      </div>

      {/* ── Vault picker ──────────────────────────────────────────────────── */}
      <VaultPicker
        open={vaultOpen}
        onClose={() => setVaultOpen(false)}
        onConfirm={(items) => setSelected((prev) => mergeUnique(prev, items))}
      />

      {/* ── Audience sheet ────────────────────────────────────────────────── */}
      {audienceOpen && (
        <AudienceSheet
          value={segment}
          excludeActiveChatters={excludeActiveChatters}
          onChange={(seg) => setSegment(seg)}
          onToggleExclude={() => setExcludeActiveChatters((v) => !v)}
          onClose={() => setAudienceOpen(false)}
        />
      )}

      {/* ── Schedule sheet ────────────────────────────────────────────────── */}
      {scheduleOpen && (
        <ScheduleSheet
          value={scheduledFor}
          onChange={(d) => setScheduledFor(d)}
          onClose={() => setScheduleOpen(false)}
        />
      )}
    </>
  );
}