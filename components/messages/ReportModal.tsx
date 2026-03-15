"use client";

import { useState } from "react";
import { X, CheckCircle } from "lucide-react";

const REASONS = [
  "Inappropriate content",
  "Harassment or bullying",
  "Spam",
  "Scam or fraud",
  "Underage content",
  "Impersonation",
  "Other",
];

type Context = "post" | "message" | "user";

interface Props {
  context:   Context;
  username?: string;
  onClose:   () => void;
  onSubmit?: (reason: string, details: string) => void;
}

export function ReportModal({ context, username, onClose, onSubmit }: Props) {
  const [selected,  setSelected]  = useState<string | null>(null);
  const [details,   setDetails]   = useState("");
  const [submitted, setSubmitted] = useState(false);

  const contextLabel =
    context === "post"    ? "Reporting this post" :
    context === "message" ? "Reporting this message" :
    `Reporting @${username ?? "user"}`;

  const handleSubmit = () => {
    if (!selected) return;
    onSubmit?.(selected, details);
    setSubmitted(true);
  };

  return (
    <div
      style={{ position:"fixed", inset:0, backgroundColor:"rgba(0,0,0,0.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, fontFamily:"'Inter',sans-serif" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ backgroundColor:"#0D0D1A", borderRadius:"16px", width:"480px", border:"1px solid #1E1E2E", overflow:"hidden" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", padding:"20px 24px 16px", borderBottom:"1px solid #1E1E2E" }}>
          <div>
            <p style={{ margin:0, fontSize:"16px", fontWeight:700, color:"#FFFFFF" }}>Report</p>
            <p style={{ margin:"4px 0 0", fontSize:"12px", color:"#A3A3C2" }}>
              {contextLabel.startsWith("Reporting @") ? (
                <>
                  Reporting{" "}
                  <span style={{ color:"#8B5CF6" }}>@{username}</span>
                </>
              ) : contextLabel}
            </p>
          </div>
          <button onClick={onClose}
            style={{ background:"none", border:"none", cursor:"pointer", color:"#A3A3C2", display:"flex", padding:"2px", borderRadius:"6px", transition:"color 0.15s ease" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#A3A3C2")}
          >
            <X size={20} strokeWidth={1.8} />
          </button>
        </div>

        {!submitted ? (
          <>
            <div style={{ padding:"16px 24px", display:"flex", flexDirection:"column", gap:"8px" }}>
              <p style={{ margin:"0 0 4px", fontSize:"14px", fontWeight:500, color:"#FFFFFF" }}>
                Why are you reporting this?
              </p>

              {REASONS.map((reason) => {
                const isSelected = selected === reason;
                return (
                  <div key={reason}>
                    <button
                      onClick={() => setSelected(reason)}
                      style={{
                        display:         "flex",
                        alignItems:      "center",
                        gap:             "12px",
                        width:           "100%",
                        padding:         "12px 14px",
                        borderRadius:    "10px",
                        border:          `1px solid ${isSelected ? "#8B5CF6" : "transparent"}`,
                        backgroundColor: isSelected ? "#1A1A2E" : "#1C1C2E",
                        cursor:          "pointer",
                        textAlign:       "left",
                        transition:      "all 0.15s ease",
                        borderLeft:      isSelected ? "3px solid #8B5CF6" : "3px solid transparent",
                        fontFamily:      "'Inter', sans-serif",
                      }}
                      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = "#1E1E2E"; }}
                      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = "#1C1C2E"; }}
                    >
                      {/* Radio */}
                      <div style={{
                        width:           "18px",
                        height:          "18px",
                        borderRadius:    "50%",
                        border:          `2px solid ${isSelected ? "#8B5CF6" : "#2A2A3D"}`,
                        backgroundColor: isSelected ? "#8B5CF6" : "transparent",
                        display:         "flex",
                        alignItems:      "center",
                        justifyContent:  "center",
                        flexShrink:      0,
                        transition:      "all 0.15s ease",
                      }}>
                        {isSelected && <div style={{ width:"7px", height:"7px", borderRadius:"50%", backgroundColor:"#FFFFFF" }} />}
                      </div>
                      <span style={{ fontSize:"14px", color:"#FFFFFF", fontWeight: isSelected ? 500 : 400 }}>
                        {reason}
                      </span>
                    </button>

                    {/* Inline textarea for selected reason */}
                    {isSelected && (
                      <div style={{ marginTop:"6px", position:"relative" }}>
                        <textarea
                          value={details}
                          onChange={(e) => setDetails(e.target.value)}
                          placeholder="Add more details (optional)"
                          maxLength={300}
                          rows={3}
                          style={{
                            width:           "100%",
                            backgroundColor: "#1C1C2E",
                            border:          "1px solid #8B5CF6",
                            borderRadius:    "10px",
                            padding:         "10px 14px",
                            fontSize:        "13px",
                            color:           "#FFFFFF",
                            outline:         "none",
                            resize:          "none",
                            fontFamily:      "'Inter', sans-serif",
                            lineHeight:      1.5,
                            boxSizing:       "border-box",
                          }}
                        />
                        <span style={{ position:"absolute", bottom:"10px", right:"12px", fontSize:"11px", color:"#4A4A6A" }}>
                          {details.length}/300
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
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
              <button onClick={handleSubmit} disabled={!selected}
                style={{
                  padding:         "11px 28px",
                  borderRadius:    "10px",
                  border:          "none",
                  cursor:          selected ? "pointer" : "default",
                  background:      selected ? "linear-gradient(to right, #8B5CF6, #EC4899)" : "#2A2A3D",
                  color:           selected ? "#FFFFFF" : "#4A4A6A",
                  fontSize:        "14px",
                  fontWeight:      700,
                  fontFamily:      "'Inter', sans-serif",
                  transition:      "opacity 0.15s ease",
                }}
                onMouseEnter={(e) => { if (selected) e.currentTarget.style.opacity = "0.88"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
              >
                Submit Report
              </button>
            </div>
          </>
        ) : (
          /* Success state */
          <div style={{ padding:"48px 24px", display:"flex", flexDirection:"column", alignItems:"center", gap:"16px", textAlign:"center" }}>
            <div style={{ width:"64px", height:"64px", borderRadius:"50%", backgroundColor:"rgba(139,92,246,0.15)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <CheckCircle size={32} color="#8B5CF6" strokeWidth={1.8} />
            </div>
            <div>
              <p style={{ margin:0, fontSize:"18px", fontWeight:700, color:"#FFFFFF" }}>Thanks for your report</p>
              <p style={{ margin:"8px 0 0", fontSize:"14px", color:"#A3A3C2", lineHeight:1.5 }}>
                We'll review this and take action within 24 hours
              </p>
            </div>
            <button
              style={{ width:"100%", padding:"12px", borderRadius:"10px", border:"1px solid #FF6B6B", cursor:"pointer", backgroundColor:"transparent", color:"#FF6B6B", fontSize:"14px", fontWeight:500, fontFamily:"'Inter',sans-serif", transition:"all 0.15s ease", marginTop:"4px" }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,107,107,0.08)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
            >
              Block this user too?
            </button>
            <button onClick={onClose}
              style={{ width:"100%", padding:"12px", borderRadius:"10px", border:"none", cursor:"pointer", background:"linear-gradient(to right, #8B5CF6, #EC4899)", color:"#FFFFFF", fontSize:"14px", fontWeight:700, fontFamily:"'Inter',sans-serif", transition:"opacity 0.15s ease" }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}