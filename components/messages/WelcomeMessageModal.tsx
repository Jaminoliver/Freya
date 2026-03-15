"use client";

import { useState, useRef } from "react";
import { X, ImageIcon, VideoIcon, Bold, Italic } from "lucide-react";

interface Props {
  onClose: () => void;
  onSave:  (data: { type: "text" | "media"; text: string; file?: File; enabled: boolean }) => void;
}

export function WelcomeMessageModal({ onClose, onSave }: Props) {
  const [contentType, setContentType] = useState<"text" | "media">("media");
  const [text,        setText]        = useState("");
  const [file,        setFile]        = useState<File | null>(null);
  const [previewUrl,  setPreviewUrl]  = useState<string | null>(null);
  const [enabled,     setEnabled]     = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const canSave = text.trim().length > 0 || file !== null;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    e.target.value = "";
  };

  const handleSave = () => {
    if (!canSave) return;
    onSave({ type: contentType, text, file: file ?? undefined, enabled });
    onClose();
  };

  return (
    <div
      style={{
        position:        "fixed",
        inset:           0,
        backgroundColor: "rgba(0,0,0,0.75)",
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "center",
        zIndex:          200,
        fontFamily:      "'Inter', sans-serif",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          backgroundColor: "#0D0D1A",
          borderRadius:    "16px",
          width:           "480px",
          maxHeight:       "90vh",
          overflowY:       "auto",
          scrollbarWidth:  "none",
          border:          "1px solid #1E1E2E",
        }}
      >
        {/* Header */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", padding:"20px 24px 16px", borderBottom:"1px solid #1E1E2E" }}>
          <div>
            <p style={{ margin:0, fontSize:"16px", fontWeight:700, color:"#FFFFFF" }}>Welcome Message</p>
            <p style={{ margin:"4px 0 0", fontSize:"12px", color:"#A3A3C2" }}>Sent automatically to new subscribers</p>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"#A3A3C2", display:"flex", padding:"2px", borderRadius:"6px", transition:"color 0.15s ease" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#A3A3C2")}
          >
            <X size={20} strokeWidth={1.8} />
          </button>
        </div>

        <div style={{ padding:"20px 24px", display:"flex", flexDirection:"column", gap:"20px" }}>

          {/* Content type selector */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
            {(["text", "media"] as const).map((type) => (
              <button key={type} onClick={() => setContentType(type)}
                style={{
                  padding:         "11px",
                  borderRadius:    "10px",
                  border:          `1px solid ${contentType === type ? "#8B5CF6" : "#2A2A3D"}`,
                  cursor:          "pointer",
                  backgroundColor: contentType === type ? "rgba(139,92,246,0.12)" : "#1C1C2E",
                  color:           contentType === type ? "#FFFFFF" : "#A3A3C2",
                  fontSize:        "14px",
                  fontWeight:      contentType === type ? 600 : 400,
                  fontFamily:      "'Inter', sans-serif",
                  transition:      "all 0.15s ease",
                  textTransform:   "capitalize",
                }}
              >
                {type === "text" ? "Text Only" : "Text + Media"}
              </button>
            ))}
          </div>

          {/* Media upload zone */}
          {contentType === "media" && (
            <div>
              <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display:"none" }} onChange={handleFile} />
              {!previewUrl ? (
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{
                    height:          "180px",
                    borderRadius:    "12px",
                    border:          "1.5px dashed #4A4A6A",
                    backgroundColor: "#1C1C2E",
                    display:         "flex",
                    flexDirection:   "column",
                    alignItems:      "center",
                    justifyContent:  "center",
                    gap:             "10px",
                    cursor:          "pointer",
                    transition:      "border-color 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#8B5CF6")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#4A4A6A")}
                >
                  <div style={{ display:"flex", gap:"8px" }}>
                    <ImageIcon size={24} color="#8B5CF6" strokeWidth={1.5} />
                    <VideoIcon size={24} color="#8B5CF6" strokeWidth={1.5} />
                  </div>
                  <p style={{ margin:0, fontSize:"14px", fontWeight:500, color:"#FFFFFF" }}>Add a photo or video</p>
                  <p style={{ margin:0, fontSize:"13px", color:"#8B5CF6", textDecoration:"underline", cursor:"pointer" }}>Browse files</p>
                </div>
              ) : (
                <div style={{ position:"relative", height:"180px", borderRadius:"12px", overflow:"hidden", border:"1.5px solid #8B5CF6" }}>
                  {file?.type.startsWith("video/") ? (
                    <video src={previewUrl} style={{ width:"100%", height:"100%", objectFit:"cover" }} muted />
                  ) : (
                    <img src={previewUrl} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  )}
                  <button
                    onClick={() => { setFile(null); setPreviewUrl(null); }}
                    style={{ position:"absolute", top:"8px", right:"8px", width:"24px", height:"24px", borderRadius:"50%", border:"none", cursor:"pointer", backgroundColor:"#FF6B6B", display:"flex", alignItems:"center", justifyContent:"center", padding:0 }}
                  >
                    <X size={12} color="#FFFFFF" strokeWidth={2.5} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Textarea */}
          <div style={{ position:"relative" }}>
            <div style={{ display:"flex", gap:"6px", marginBottom:"6px" }}>
              {[{ icon: Bold, label: "Bold" }, { icon: Italic, label: "Italic" }].map(({ icon: Icon, label }) => (
                <button key={label} title={label}
                  style={{ background:"none", border:"none", cursor:"pointer", color:"#A3A3C2", padding:"4px 6px", borderRadius:"4px", transition:"all 0.15s ease", fontSize:"12px", fontFamily:"'Inter',sans-serif" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; e.currentTarget.style.backgroundColor = "#1C1C2E"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "#A3A3C2"; e.currentTarget.style.backgroundColor = "transparent"; }}
                >
                  <Icon size={14} strokeWidth={1.8} />
                </button>
              ))}
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write your welcome message..."
              maxLength={300}
              rows={4}
              style={{
                width:           "100%",
                backgroundColor: "#1C1C2E",
                border:          "1px solid #2A2A3D",
                borderRadius:    "12px",
                padding:         "12px 14px",
                fontSize:        "14px",
                color:           "#FFFFFF",
                outline:         "none",
                resize:          "none",
                fontFamily:      "'Inter', sans-serif",
                lineHeight:      1.5,
                boxSizing:       "border-box",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#8B5CF6")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#2A2A3D")}
            />
            <span style={{ position:"absolute", bottom:"10px", right:"12px", fontSize:"12px", color:"#4A4A6A" }}>
              {text.length}/300
            </span>
          </div>

          {/* Auto-send toggle */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", paddingTop:"4px", borderTop:"1px solid #1E1E2E" }}>
            <div>
              <p style={{ margin:0, fontSize:"14px", fontWeight:500, color:"#FFFFFF" }}>Send automatically to new fans</p>
              <p style={{ margin:"3px 0 0", fontSize:"12px", color:"#A3A3C2" }}>New subscribers will receive this message instantly</p>
            </div>
            <button onClick={() => setEnabled(!enabled)}
              style={{ position:"relative", width:"36px", height:"20px", borderRadius:"10px", border:"none", cursor:"pointer", backgroundColor: enabled ? "#8B5CF6" : "#2A2A3D", transition:"background-color 0.2s ease", flexShrink:0, padding:0 }}
            >
              <div style={{ position:"absolute", top:"2px", left: enabled ? "18px" : "2px", width:"16px", height:"16px", borderRadius:"50%", backgroundColor: enabled ? "#FFFFFF" : "#4A4A6A", transition:"left 0.2s ease" }} />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 24px", borderTop:"1px solid #1E1E2E" }}>
          <button onClick={onClose}
            style={{ background:"none", border:"none", cursor:"pointer", color:"#A3A3C2", fontSize:"14px", fontWeight:500, fontFamily:"'Inter',sans-serif", transition:"color 0.15s ease" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#A3A3C2")}
          >
            Cancel
          </button>
          <button onClick={handleSave} disabled={!canSave}
            style={{
              padding:         "11px 28px",
              borderRadius:    "10px",
              border:          "none",
              cursor:          canSave ? "pointer" : "default",
              background:      canSave ? "linear-gradient(to right, #8B5CF6, #EC4899)" : "#2A2A3D",
              color:           canSave ? "#FFFFFF" : "#4A4A6A",
              fontSize:        "14px",
              fontWeight:      700,
              fontFamily:      "'Inter', sans-serif",
              transition:      "opacity 0.15s ease",
            }}
            onMouseEnter={(e) => { if (canSave) e.currentTarget.style.opacity = "0.88"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
          >
            Save Message
          </button>
        </div>
      </div>
    </div>
  );
}