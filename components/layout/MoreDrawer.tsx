"use client";

import { useState } from "react";
import { User, Bookmark, Settings, Wallet, HelpCircle, LogOut, X, Sparkles, Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { useAppStore } from "@/lib/store/appStore";
import { useNav } from "@/lib/hooks/useNav";

interface MoreDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MoreDrawer({ isOpen, onClose }: MoreDrawerProps) {
  const { navigate } = useNav();
  const viewer  = useAppStore((s) => s.viewer);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.error("[MoreDrawer] Logout failed:", err);
      setLoggingOut(false);
    }
    onClose();
  };

  const handleNav = (href: string) => {
    if (href === "#") return;
    onClose();
    navigate(href);
  };

  const navItems = [
    { label: "Profile",       icon: User,     href: viewer ? `/${viewer.username}` : "#" },
    { label: "Notifications", icon: Bell,     href: "/notifications" },
    { label: "Saved",         icon: Bookmark, href: "/saved"         },
    { label: "Settings",      icon: Settings, href: "/settings"      },
    { label: "Wallet",        icon: Wallet,   href: "/wallet"        },
  ];

  if (!isOpen) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 200, backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(2px)", animation: "fadeIn 0.2s ease" }}
      />

      <div
        style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 201, backgroundColor: "#13131F", borderTop: "1px solid #2A2A3D", borderRadius: "20px 20px 0 0", padding: "12px 0 32px", animation: "slideUp 0.25s ease", fontFamily: "'Inter', sans-serif", maxWidth: "480px", margin: "0 auto" }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
          <div style={{ width: "36px", height: "4px", borderRadius: "2px", backgroundColor: "#2A2A3D" }} />
        </div>

        <button onClick={onClose} style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", cursor: "pointer", color: "#6B6B8A", display: "flex" }}>
          <X size={20} />
        </button>

        {viewer ? (
          <div onClick={() => handleNav(`/${viewer.username}`)} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 20px 16px", cursor: "pointer", borderBottom: "1px solid #1F1F2A", marginBottom: "8px" }}>
            <Avatar src={viewer.avatar_url ? viewer.avatar_url : undefined} alt={viewer.display_name || viewer.username} size="md" showRing />
            <div>
              <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#F1F5F9" }}>{viewer.display_name || viewer.username}</p>
              <p style={{ margin: 0, fontSize: "12px", color: "#6B6B8A" }}>@{viewer.username}</p>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 20px 16px", borderBottom: "1px solid #1F1F2A", marginBottom: "8px" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#2A2A3D", animation: "pulse 1.5s ease-in-out infinite" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ width: "100px", height: "12px", borderRadius: "6px", backgroundColor: "#2A2A3D", animation: "pulse 1.5s ease-in-out infinite" }} />
              <div style={{ width: "70px",  height: "10px", borderRadius: "6px", backgroundColor: "#2A2A3D", animation: "pulse 1.5s ease-in-out infinite" }} />
            </div>
          </div>
        )}

        {navItems.map(({ label, icon: Icon, href }) => (
          <button key={label} onClick={() => handleNav(href)} disabled={href === "#"}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: "14px", padding: "13px 20px", background: "none", border: "none", cursor: href === "#" ? "default" : "pointer", fontFamily: "'Inter', sans-serif", transition: "background 0.15s", opacity: href === "#" ? 0.4 : 1 }}
            onMouseEnter={(e) => { if (href !== "#") e.currentTarget.style.backgroundColor = "#1C1C2E"; }}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <Icon size={20} color="#A3A3C2" strokeWidth={1.8} />
            <span style={{ fontSize: "15px", color: "#F1F5F9", fontWeight: 500 }}>{label}</span>
          </button>
        ))}

        {viewer?.role === "fan" && <button onClick={() => handleNav("/become-a-creator")}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: "14px", padding: "13px 20px", background: "none", border: "none", cursor: "pointer", fontFamily: "'Inter', sans-serif", transition: "background 0.15s" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1C1C2E")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <Sparkles size={20} color="#8B5CF6" strokeWidth={1.8} />
          <span style={{ fontSize: "15px", color: "#8B5CF6", fontWeight: 500 }}>Become a Creator</span>
        </button>}

        <div style={{ height: "1px", backgroundColor: "#1F1F2A", margin: "8px 0" }} />

        <button onClick={() => handleNav("/help")}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: "14px", padding: "13px 20px", background: "none", border: "none", cursor: "pointer", fontFamily: "'Inter', sans-serif", transition: "background 0.15s" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1C1C2E")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <HelpCircle size={20} color="#A3A3C2" strokeWidth={1.8} />
          <span style={{ fontSize: "15px", color: "#F1F5F9", fontWeight: 500 }}>Help & Support</span>
        </button>

        <button onClick={handleLogout} disabled={loggingOut}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: "14px", padding: "13px 20px", background: "none", border: "none", cursor: loggingOut ? "default" : "pointer", fontFamily: "'Inter', sans-serif", transition: "background 0.15s", opacity: loggingOut ? 0.5 : 1 }}
          onMouseEnter={(e) => { if (!loggingOut) e.currentTarget.style.backgroundColor = "#1C1C2E"; }}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <LogOut size={20} color="#EF4444" strokeWidth={1.8} />
          <span style={{ fontSize: "15px", color: "#EF4444", fontWeight: 500 }}>{loggingOut ? "Logging out..." : "Log out"}</span>
        </button>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </>
  );
}