"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Star, Bell, Pin, Images, Search, MoreVertical } from "lucide-react";
import { Sparkles } from "lucide-react";
import { ChatHeader } from "@/components/messages/ChatHeader";
import { MessagesList } from "@/components/messages/MessagesList";
import { MessageInput } from "@/components/messages/MessageInput";
import type { Conversation, Message } from "@/lib/types/messages";

interface Props {
  conversation: Conversation;
  messages:     Message[];
  onBack:       () => void;
}

export function ChatPanel({ conversation, messages, onBack }: Props) {
  const { participant } = conversation;
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSend = (text: string, mediaFiles?: File[], ppvPrice?: number) => {
    console.log("send", { text, mediaFiles, ppvPrice });
  };

  return (
    <>
      <style>{`
        @keyframes dropdownIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .chat-panel-dropdown { animation: dropdownIn 0.15s ease forwards; }
        /* Desktop inline header — hidden on mobile */
        .chat-desktop-header { display: flex; }
        @media (max-width: 767px) {
          .chat-desktop-header { display: none !important; }
        }
      `}</style>

      <div
        style={{
          flex:            1,
          display:         "flex",
          flexDirection:   "column",
          height:          "100vh",
          backgroundColor: "#0A0A0F",
          fontFamily:      "'Inter', sans-serif",
        }}
      >
        {/* Mobile: fixed header */}
        <ChatHeader conversation={conversation} onBack={onBack} />

        {/* Desktop: inline header scoped to this chat column */}
        <div
          className="chat-desktop-header"
          style={{
            alignItems:      "center",
            justifyContent:  "space-between",
            padding:         "0 16px",
            height:          "56px",
            flexShrink:      0,
            backgroundColor: "#0D0D1A",
            borderBottom:    "1px solid #1E1E2E",
            fontFamily:      "'Inter', sans-serif",
          }}
        >
          {/* Left — back + avatar + name */}
          <div style={{ display:"flex", alignItems:"center", gap:"12px", minWidth:0, flex:1 }}>
            <button
              onClick={onBack}
              style={{ background:"none", border:"none", cursor:"pointer", color:"#A3A3C2", display:"flex", alignItems:"center", padding:"4px", borderRadius:"6px", transition:"color 0.15s ease", flexShrink:0 }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#A3A3C2")}
            >
              <ArrowLeft size={20} strokeWidth={1.8} />
            </button>

            <div style={{ position:"relative", flexShrink:0 }}>
              <div style={{ width:"40px", height:"40px", borderRadius:"50%", overflow:"hidden", backgroundColor:"#2A2A3D" }}>
                {participant.avatarUrl ? (
                  <img src={participant.avatarUrl} alt={participant.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                ) : (
                  <div style={{ width:"100%", height:"100%", backgroundColor:"#8B5CF6", display:"flex", alignItems:"center", justifyContent:"center", color:"#FFFFFF", fontSize:"16px", fontWeight:700 }}>
                    {participant.name[0].toUpperCase()}
                  </div>
                )}
              </div>
              {participant.isOnline && (
                <div style={{ position:"absolute", bottom:"1px", right:"1px", width:"10px", height:"10px", borderRadius:"50%", backgroundColor:"#10B981", border:"2px solid #0D0D1A" }} />
              )}
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:"2px", minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:"5px" }}>
                <span style={{ fontSize:"16px", fontWeight:700, color:"#FFFFFF", whiteSpace:"nowrap" }}>
                  {participant.name}
                </span>
                {participant.isVerified && <Sparkles size={14} color="#8B5CF6" strokeWidth={1.8} />}
              </div>
              {participant.isOnline && (
                <div style={{ display:"flex", alignItems:"center", gap:"5px" }}>
                  <div style={{ width:"7px", height:"7px", borderRadius:"50%", backgroundColor:"#10B981", flexShrink:0 }} />
                  <span style={{ fontSize:"12px", color:"#10B981", whiteSpace:"nowrap" }}>Available now</span>
                </div>
              )}
            </div>
          </div>

          {/* Right — 3 dot menu */}
          <div ref={dropdownRef} style={{ position:"relative", flexShrink:0 }}>
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              style={{
                background:      "none",
                border:          "none",
                cursor:          "pointer",
                color:           dropdownOpen ? "#8B5CF6" : "#A3A3C2",
                display:         "flex",
                alignItems:      "center",
                padding:         "8px",
                borderRadius:    "8px",
                transition:      "all 0.15s ease",
                backgroundColor: dropdownOpen ? "rgba(139,92,246,0.1)" : "transparent",
              }}
              onMouseEnter={(e) => { if (!dropdownOpen) { e.currentTarget.style.color="#FFFFFF"; e.currentTarget.style.backgroundColor="#1C1C2E"; }}}
              onMouseLeave={(e) => { if (!dropdownOpen) { e.currentTarget.style.color="#A3A3C2"; e.currentTarget.style.backgroundColor="transparent"; }}}
            >
              <MoreVertical size={20} strokeWidth={1.8} />
            </button>

            {dropdownOpen && (
              <div
                className="chat-panel-dropdown"
                style={{
                  position:        "absolute",
                  top:             "calc(100% + 6px)",
                  right:           0,
                  backgroundColor: "#1C1C2E",
                  border:          "1px solid #2A2A3D",
                  borderRadius:    "12px",
                  padding:         "6px",
                  minWidth:        "180px",
                  zIndex:          100,
                  boxShadow:       "0 8px 24px rgba(0,0,0,0.4)",
                }}
              >
                {[
                  { icon: Star,   label: "Favourite" },
                  { icon: Bell,   label: "Notifications" },
                  { icon: Pin,    label: "Pin chat" },
                  { icon: Images, label: "Gallery" },
                  { icon: Search, label: "Find in chat" },
                ].map(({ icon: Icon, label }) => (
                  <button
                    key={label}
                    onClick={() => setDropdownOpen(false)}
                    style={{
                      display:         "flex",
                      alignItems:      "center",
                      gap:             "10px",
                      width:           "100%",
                      padding:         "10px 12px",
                      borderRadius:    "8px",
                      border:          "none",
                      cursor:          "pointer",
                      backgroundColor: "transparent",
                      color:           "#FFFFFF",
                      fontSize:        "14px",
                      fontFamily:      "'Inter', sans-serif",
                      textAlign:       "left",
                      transition:      "background-color 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2A2A3D")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <Icon size={15} color="#A3A3C2" strokeWidth={1.8} />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <MessagesList messages={messages} conversation={conversation} />
        <MessageInput onSend={handleSend} />
      </div>
    </>
  );
}