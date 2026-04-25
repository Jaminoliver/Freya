"use client";

import * as React from "react";
import { X } from "lucide-react";
import type { User } from "@/lib/types/profile";
import type { Currency } from "@/lib/types/checkout";
import { CURRENCIES } from "../components/CurrencySwitcher";

interface TipSuccessScreenProps {
  creator: User;
  amount:  number;
  currency: Currency;
  onClose: () => void;
  onVisitProfile: () => void;
}

export default function TipSuccessScreen({ creator, amount, currency, onClose, onVisitProfile }: TipSuccessScreenProps) {
  const symbol      = CURRENCIES.find((c) => c.code === currency)?.symbol ?? "₦";
  const creatorName = creator.display_name || creator.username;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 20px 28px", position: "relative", overflow: "hidden" }}>
      <style>{`
        @keyframes tipPop   { 0%{transform:scale(0);opacity:0} 60%{transform:scale(1.15);opacity:1} 100%{transform:scale(1);opacity:1} }
        @keyframes tipFadeUp{ 0%{opacity:0;transform:translateY(10px)} 100%{opacity:1;transform:translateY(0)} }
      `}</style>

      <button onClick={onClose} style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex" }}>
        <X size={18} color="#6B6B8A" />
      </button>

      {/* Icon */}
      <div style={{ position: "relative", marginBottom: "20px", marginTop: "8px", animation: "tipPop 0.45s ease-out forwards" }}>
        <div style={{ position: "absolute", inset: "-10px", borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)" }} />
        <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "linear-gradient(135deg, #8B5CF6, #EC4899)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 8px rgba(139,92,246,0.1)" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="rgba(255,255,255,0.15)" stroke="none"/>
            <path d="M12 6v6l4 2" />
          </svg>
        </div>
      </div>

      {/* Text */}
      <h2 style={{ margin: "0 0 6px", fontSize: "22px", fontWeight: 800, color: "#F1F5F9", animation: "tipFadeUp 0.4s ease-out 0.2s both" }}>
        Tip Sent! 🎉
      </h2>
      <p style={{ margin: "0 0 24px", fontSize: "13px", color: "#A3A3C2", textAlign: "center", animation: "tipFadeUp 0.4s ease-out 0.3s both" }}>
        You tipped <span style={{ color: "#F1F5F9", fontWeight: 600 }}>{creatorName}</span>
      </p>

      {/* Amount card */}
      <div style={{ width: "100%", backgroundColor: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: "14px", padding: "18px 20px", marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "space-between", animation: "tipFadeUp 0.4s ease-out 0.4s both" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", overflow: "hidden", border: "2px solid #3A3A4D", flexShrink: 0 }}>
            {creator.avatar_url
              ? <img src={creator.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <div style={{ width: "100%", height: "100%", backgroundColor: "#2A2A3D", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: "#8B5CF6" }}>{creatorName.charAt(0).toUpperCase()}</span>
                </div>
            }
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#F1F5F9" }}>{creatorName}</p>
            <p style={{ margin: 0, fontSize: "11px", color: "#6B6B8A" }}>@{creator.username}</p>
          </div>
        </div>
        <p style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "#8B5CF6" }}>
          {symbol}{amount.toLocaleString()}
        </p>
      </div>

      {/* CTA */}
      <button
        onClick={onVisitProfile}
        style={{ width: "100%", padding: "13px", borderRadius: "10px", background: "linear-gradient(135deg, #8B5CF6, #7C3AED)", border: "none", cursor: "pointer", fontFamily: "'Inter', sans-serif", animation: "tipFadeUp 0.4s ease-out 0.5s both" }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
      >
        <span style={{ fontSize: "14px", fontWeight: 700, color: "#fff" }}>Visit {creatorName}'s Profile</span>
      </button>
    </div>
  );
}