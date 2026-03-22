"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, ImageIcon, VideoIcon, Bold, Italic, Plus, DollarSign, User } from "lucide-react";

interface MediaItem {
  id?: number;
  file?: File;
  previewUrl: string;
  mediaType: "photo" | "video";
  isExisting: boolean;
}

interface Props {
  onClose: () => void;
  onSave: () => void;
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function Skeleton({ width, height, radius = "8px" }: { width: string; height: string; radius?: string }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        backgroundColor: "#1C1C2E",
        animation: "skeletonPulse 1.4s ease-in-out infinite",
      }}
    />
  );
}

function SkeletonLoader() {
  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        <Skeleton width="100%" height="42px" radius="10px" />
        <Skeleton width="100%" height="42px" radius="10px" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
        <div style={{ aspectRatio: "1" }}><Skeleton width="100%" height="100%" radius="10px" /></div>
        <div style={{ aspectRatio: "1" }}><Skeleton width="100%" height="100%" radius="10px" /></div>
        <div style={{ aspectRatio: "1" }}><Skeleton width="100%" height="100%" radius="10px" /></div>
      </div>
      <div style={{ display: "flex", gap: "6px" }}>
        <Skeleton width="28px" height="22px" radius="4px" />
        <Skeleton width="28px" height="22px" radius="4px" />
        <Skeleton width="80px" height="22px" radius="6px" />
      </div>
      <Skeleton width="100%" height="100px" radius="12px" />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "4px", borderTop: "1px solid #1E1E2E" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <Skeleton width="200px" height="14px" radius="4px" />
          <Skeleton width="260px" height="12px" radius="4px" />
        </div>
        <Skeleton width="36px" height="20px" radius="10px" />
      </div>
    </div>
  );
}

export function WelcomeMessageModal({ onClose, onSave }: Props) {
  const [contentType, setContentType] = useState<"text" | "media">("media");
  const [text, setText] = useState("");
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [isPpv, setIsPpv] = useState(false);
  const [ppvPrice, setPpvPrice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingMessageId, setExistingMessageId] = useState<number | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSave = text.trim().length > 0 || mediaItems.length > 0;
  const mediaSlots = 3;

  useEffect(() => {
    async function loadExisting() {
      try {
        const res = await fetch("/api/welcome-message");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();

        if (data.message) {
          setText(data.message.message_content || "");
          setIsPpv(data.message.is_ppv || false);
          setPpvPrice(data.message.ppv_price ? String(data.message.ppv_price / 100) : "");
          setExistingMessageId(data.message.id);
        }

        if (data.sequence) {
          setEnabled(data.sequence.is_active ?? true);
        }

        if (data.media && data.media.length > 0) {
          setContentType("media");
          const items: MediaItem[] = data.media.map((m: any) => ({
            id: m.id,
            previewUrl: m.media_url,
            mediaType: m.media_type as "photo" | "video",
            isExisting: true,
          }));
          setMediaItems(items);
        } else if (data.message && !data.media?.length) {
          setContentType("text");
        }
      } catch (err) {
        console.error("[WelcomeMessageModal] Load error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadExisting();
  }, []);

  const handleFiles = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;

    const remaining = mediaSlots - mediaItems.length;
    const toAdd = selected.slice(0, remaining);

    const newItems: MediaItem[] = toAdd.map((f) => ({
      file: f,
      previewUrl: URL.createObjectURL(f),
      mediaType: f.type.startsWith("video/") ? "video" : "photo",
      isExisting: false,
    }));

    setMediaItems((prev) => [...prev, ...newItems]);
    e.target.value = "";
  }, [mediaItems.length]);

  const removeMedia = useCallback((index: number) => {
    setMediaItems((prev) => {
      const item = prev[index];
      if (!item.isExisting && item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const insertFanName = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;

    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const placeholder = "{{fan_name}}";
    const newText = text.slice(0, start) + placeholder + text.slice(end);

    if (newText.length <= 300) {
      setText(newText);
      setTimeout(() => {
        ta.focus();
        const pos = start + placeholder.length;
        ta.setSelectionRange(pos, pos);
      }, 0);
    }
  }, [text]);

  const handleClose = useCallback(() => {
    if (saving) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 200);
  }, [onClose, saving]);

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);

    try {
      const formData = new FormData();
      formData.append("message_content", text);
      formData.append("is_ppv", String(isPpv));
      formData.append("enabled", String(enabled));

      if (isPpv && ppvPrice) {
        formData.append("ppv_price", String(Math.round(Number(ppvPrice) * 100)));
      }

      const existingIds = mediaItems
        .filter((m) => m.isExisting && m.id)
        .map((m) => m.id);
      formData.append("existing_media_ids", JSON.stringify(existingIds));

      mediaItems
        .filter((m) => !m.isExisting && m.file)
        .forEach((m) => formData.append("files", m.file!));

      const res = await fetch("/api/welcome-message", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }

      onSave();
      onClose();
    } catch (err) {
      console.error("[WelcomeMessageModal] Save error:", err);
      setSaving(false);
      alert("Failed to save welcome message. Please try again.");
    }
  };

  useEffect(() => {
    return () => {
      mediaItems.forEach((m) => {
        if (!m.isExisting && m.previewUrl) URL.revokeObjectURL(m.previewUrl);
      });
    };
  }, []);

  return (
    <>
      <style>{`
        @keyframes welcomeModalIn {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes welcomeModalOut {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to   { opacity: 0; transform: translateY(12px) scale(0.97); }
        }
        @keyframes welcomeOverlayIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes welcomeOverlayOut {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
        @keyframes skeletonPulse {
          0%   { opacity: 0.4; }
          50%  { opacity: 0.8; }
          100% { opacity: 0.4; }
        }
        @keyframes spinnerRotate {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.75)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          fontFamily: "'Inter', sans-serif",
          animation: isClosing
            ? "welcomeOverlayOut 0.2s ease forwards"
            : "welcomeOverlayIn 0.2s ease forwards",
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && !saving) handleClose();
        }}
      >
        <div
          style={{
            backgroundColor: "#0D0D1A",
            borderRadius: "16px",
            width: "min(480px, calc(100vw - 32px))",
            maxHeight: "min(90vh, calc(100vh - 48px))",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            border: "1px solid #1E1E2E",
            animation: isClosing
              ? "welcomeModalOut 0.2s ease forwards"
              : "welcomeModalIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
            position: "relative",
          }}
        >
          {/* Save spinner overlay */}
          {saving && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundColor: "rgba(13,13,26,0.85)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10,
                borderRadius: "16px",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  border: "3px solid #2A2A3D",
                  borderTopColor: "#8B5CF6",
                  borderRadius: "50%",
                  animation: "spinnerRotate 0.7s linear infinite",
                }}
              />
            </div>
          )}

          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              padding: "20px 24px 16px",
              borderBottom: "1px solid #1E1E2E",
              flexShrink: 0,
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#FFFFFF" }}>
                Welcome Message
              </p>
              <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#A3A3C2" }}>
                Sent automatically to new subscribers
              </p>
            </div>
            <button
              onClick={handleClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#A3A3C2",
                display: "flex",
                padding: "2px",
                borderRadius: "6px",
                transition: "color 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#A3A3C2")}
            >
              <X size={20} strokeWidth={1.8} />
            </button>
          </div>

          {loading ? (
            <SkeletonLoader />
          ) : (
            <>
              {/* Scrollable content */}
              <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none", padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* Content type selector */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  {(["text", "media"] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setContentType(type)}
                      style={{
                        padding: "11px",
                        borderRadius: "10px",
                        border: `1px solid ${contentType === type ? "#8B5CF6" : "#2A2A3D"}`,
                        cursor: "pointer",
                        backgroundColor: contentType === type ? "rgba(139,92,246,0.12)" : "#1C1C2E",
                        color: contentType === type ? "#FFFFFF" : "#A3A3C2",
                        fontSize: "14px",
                        fontWeight: contentType === type ? 600 : 400,
                        fontFamily: "'Inter', sans-serif",
                        transition: "all 0.15s ease",
                        textTransform: "capitalize",
                      }}
                    >
                      {type === "text" ? "Text Only" : "Text + Media"}
                    </button>
                  ))}
                </div>

                {/* Media upload zone */}
                {contentType === "media" && (
                  <div>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      style={{ display: "none" }}
                      onChange={handleFiles}
                    />

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                      {mediaItems.map((item, i) => (
                        <div
                          key={i}
                          style={{
                            position: "relative",
                            aspectRatio: "1",
                            borderRadius: "10px",
                            overflow: "hidden",
                            border: "1.5px solid #8B5CF6",
                          }}
                        >
                          {item.mediaType === "video" ? (
                            <video
                              src={item.previewUrl}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              muted
                            />
                          ) : (
                            <img
                              src={item.previewUrl}
                              alt=""
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          )}
                          <button
                            onClick={() => removeMedia(i)}
                            style={{
                              position: "absolute",
                              top: "4px",
                              right: "4px",
                              width: "22px",
                              height: "22px",
                              borderRadius: "50%",
                              border: "none",
                              cursor: "pointer",
                              backgroundColor: "#FF6B6B",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: 0,
                            }}
                          >
                            <X size={10} color="#FFFFFF" strokeWidth={2.5} />
                          </button>
                          <div
                            style={{
                              position: "absolute",
                              bottom: "4px",
                              left: "4px",
                              backgroundColor: "rgba(0,0,0,0.7)",
                              borderRadius: "4px",
                              padding: "2px 6px",
                              fontSize: "10px",
                              color: "#FFFFFF",
                              textTransform: "uppercase",
                            }}
                          >
                            {item.mediaType}
                          </div>
                        </div>
                      ))}

                      {mediaItems.length < mediaSlots && (
                        <div
                          onClick={() => fileRef.current?.click()}
                          style={{
                            aspectRatio: "1",
                            borderRadius: "10px",
                            border: "1.5px dashed #4A4A6A",
                            backgroundColor: "#1C1C2E",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px",
                            cursor: "pointer",
                            transition: "border-color 0.15s ease",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#8B5CF6")}
                          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#4A4A6A")}
                        >
                          {mediaItems.length === 0 ? (
                            <>
                              <div style={{ display: "flex", gap: "6px" }}>
                                <ImageIcon size={18} color="#8B5CF6" strokeWidth={1.5} />
                                <VideoIcon size={18} color="#8B5CF6" strokeWidth={1.5} />
                              </div>
                              <p style={{ margin: 0, fontSize: "11px", fontWeight: 500, color: "#A3A3C2", textAlign: "center" }}>
                                Add media
                              </p>
                            </>
                          ) : (
                            <>
                              <Plus size={20} color="#8B5CF6" strokeWidth={1.5} />
                              <p style={{ margin: 0, fontSize: "10px", color: "#A3A3C2" }}>
                                {mediaItems.length}/{mediaSlots}
                              </p>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Textarea */}
                <div style={{ position: "relative" }}>
                  <div style={{ display: "flex", gap: "6px", marginBottom: "6px", alignItems: "center" }}>
                    {[
                      { icon: Bold, label: "Bold" },
                      { icon: Italic, label: "Italic" },
                    ].map(({ icon: Icon, label }) => (
                      <button
                        key={label}
                        title={label}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#A3A3C2",
                          padding: "4px 6px",
                          borderRadius: "4px",
                          transition: "all 0.15s ease",
                          fontSize: "12px",
                          fontFamily: "'Inter',sans-serif",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = "#FFFFFF";
                          e.currentTarget.style.backgroundColor = "#1C1C2E";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "#A3A3C2";
                          e.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        <Icon size={14} strokeWidth={1.8} />
                      </button>
                    ))}

                    <div style={{ width: "1px", height: "16px", backgroundColor: "#2A2A3D", margin: "0 2px" }} />

                    <button
                      onClick={insertFanName}
                      title="Insert fan name"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        background: "none",
                        border: "1px solid #2A2A3D",
                        cursor: "pointer",
                        color: "#A3A3C2",
                        padding: "4px 8px",
                        borderRadius: "6px",
                        transition: "all 0.15s ease",
                        fontSize: "11px",
                        fontFamily: "'Inter',sans-serif",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "#8B5CF6";
                        e.currentTarget.style.borderColor = "#8B5CF6";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "#A3A3C2";
                        e.currentTarget.style.borderColor = "#2A2A3D";
                      }}
                    >
                      <User size={12} strokeWidth={1.8} />
                      Fan Name
                    </button>
                  </div>
                  <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Write your welcome message..."
                    maxLength={300}
                    rows={4}
                    style={{
                      width: "100%",
                      backgroundColor: "#1C1C2E",
                      border: "1px solid #2A2A3D",
                      borderRadius: "12px",
                      padding: "12px 14px",
                      fontSize: "14px",
                      color: "#FFFFFF",
                      outline: "none",
                      resize: "none",
                      fontFamily: "'Inter', sans-serif",
                      lineHeight: 1.5,
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#8B5CF6")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "#2A2A3D")}
                  />
                  <span style={{ position: "absolute", bottom: "10px", right: "12px", fontSize: "12px", color: "#4A4A6A" }}>
                    {text.length}/300
                  </span>
                </div>

                {/* PPV toggle */}
                {contentType === "media" && mediaItems.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                      paddingTop: "4px",
                      borderTop: "1px solid #1E1E2E",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <DollarSign size={16} color="#8B5CF6" strokeWidth={1.8} />
                        <div>
                          <p style={{ margin: 0, fontSize: "14px", fontWeight: 500, color: "#FFFFFF" }}>
                            Pay-Per-View
                          </p>
                          <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#A3A3C2" }}>
                            Lock media behind a price
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsPpv(!isPpv)}
                        style={{
                          position: "relative",
                          width: "36px",
                          height: "20px",
                          borderRadius: "10px",
                          border: "none",
                          cursor: "pointer",
                          backgroundColor: isPpv ? "#8B5CF6" : "#2A2A3D",
                          transition: "background-color 0.2s ease",
                          flexShrink: 0,
                          padding: 0,
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            top: "2px",
                            left: isPpv ? "18px" : "2px",
                            width: "16px",
                            height: "16px",
                            borderRadius: "50%",
                            backgroundColor: isPpv ? "#FFFFFF" : "#4A4A6A",
                            transition: "left 0.2s ease",
                          }}
                        />
                      </button>
                    </div>

                    {isPpv && (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "14px", color: "#A3A3C2", fontWeight: 500 }}>₦</span>
                        <input
                          type="number"
                          value={ppvPrice}
                          onChange={(e) => setPpvPrice(e.target.value)}
                          placeholder="Enter price"
                          min="0"
                          style={{
                            flex: 1,
                            backgroundColor: "#1C1C2E",
                            border: "1px solid #2A2A3D",
                            borderRadius: "10px",
                            padding: "10px 14px",
                            fontSize: "14px",
                            color: "#FFFFFF",
                            outline: "none",
                            fontFamily: "'Inter', sans-serif",
                            boxSizing: "border-box",
                          }}
                          onFocus={(e) => (e.currentTarget.style.borderColor = "#8B5CF6")}
                          onBlur={(e) => (e.currentTarget.style.borderColor = "#2A2A3D")}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Auto-send toggle */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingTop: "4px",
                    borderTop: "1px solid #1E1E2E",
                  }}
                >
                  <div>
                    <p style={{ margin: 0, fontSize: "14px", fontWeight: 500, color: "#FFFFFF" }}>
                      Send automatically to new fans
                    </p>
                    <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#A3A3C2" }}>
                      New subscribers will receive this message instantly
                    </p>
                  </div>
                  <button
                    onClick={() => setEnabled(!enabled)}
                    style={{
                      position: "relative",
                      width: "36px",
                      height: "20px",
                      borderRadius: "10px",
                      border: "none",
                      cursor: "pointer",
                      backgroundColor: enabled ? "#8B5CF6" : "#2A2A3D",
                      transition: "background-color 0.2s ease",
                      flexShrink: 0,
                      padding: 0,
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: "2px",
                        left: enabled ? "18px" : "2px",
                        width: "16px",
                        height: "16px",
                        borderRadius: "50%",
                        backgroundColor: enabled ? "#FFFFFF" : "#4A4A6A",
                        transition: "left 0.2s ease",
                      }}
                    />
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 24px",
                  borderTop: "1px solid #1E1E2E",
                  flexShrink: 0,
                  backgroundColor: "#0D0D1A",
                }}
              >
                <button
                  onClick={handleClose}
                  disabled={saving}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: saving ? "default" : "pointer",
                    color: "#A3A3C2",
                    fontSize: "14px",
                    fontWeight: 500,
                    fontFamily: "'Inter',sans-serif",
                    transition: "color 0.15s ease",
                    opacity: saving ? 0.4 : 1,
                  }}
                  onMouseEnter={(e) => { if (!saving) e.currentTarget.style.color = "#FFFFFF"; }}
                  onMouseLeave={(e) => { if (!saving) e.currentTarget.style.color = "#A3A3C2"; }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!canSave || saving}
                  style={{
                    padding: "11px 28px",
                    minWidth: "140px",
                    borderRadius: "10px",
                    border: "none",
                    cursor: canSave && !saving ? "pointer" : "default",
                    background: canSave && !saving ? "linear-gradient(to right, #8B5CF6, #EC4899)" : "#2A2A3D",
                    color: canSave && !saving ? "#FFFFFF" : "#4A4A6A",
                    fontSize: "14px",
                    fontWeight: 700,
                    fontFamily: "'Inter', sans-serif",
                    transition: "opacity 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (canSave && !saving) e.currentTarget.style.opacity = "0.88";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "1";
                  }}
                >
                  Save Message
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}