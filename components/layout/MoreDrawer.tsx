"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Bookmark, Settings, Wallet, HelpCircle, LogOut, X, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";

interface MoreDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Profile {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string;
}

export function MoreDrawer({ isOpen, onClose }: MoreDrawerProps) {
  const router  = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("username, display_name, avatar_url, role")
        .eq("id", user.id)
        .single();
      if (data) setProfile(data as Profile);
    };
    load();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    onClose();
  };

  const navigate = (href: string) => {
    router.push(href);
    onClose();
  };

  const navItems = [
    { label: "Profile",   icon: User,      href: profile ? `/${profile.username}` : "#" },
    { label: "Saved",     icon: Bookmark,  href: "/bookmarks"  },
    { label: "Settings",  icon: Settings,  href: "/settings"   },
    { label: "Wallet",    icon: Wallet,    href: "/wallet"     },
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 200,
          backgroundColor: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(2px)",
          animation: "fadeIn 0.2s ease",
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 201,
          backgroundColor: "#13131F",
          borderTop: "1px solid #2A2A3D",
          borderRadius: "20px 20px 0 0",
          padding: "12px 0 32px",
          animation: "slideUp 0.25s ease",
          fontFamily: "'Inter', sans-serif",
          maxWidth: "480px",
          margin: "0 auto",
        }}
      >
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
          <div style={{ width: "36px", height: "4px", borderRadius: "2px", backgroundColor: "#2A2A3D" }} />
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", cursor: "pointer", color: "#6B6B8A", display: "flex" }}
        >
          <X size={20} />
        </button>

        {/* User info */}
        {profile && (
          <div
            onClick={() => navigate(`/${profile.username}`)}
            style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 20px 16px", cursor: "pointer", borderBottom: "1px solid #1F1F2A", marginBottom: "8px" }}
          >
            <Avatar src={profile.avatar_url ?? undefined} alt={profile.display_name || profile.username} size="md" showRing />
            <div>
              <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#F1F5F9" }}>{profile.display_name || profile.username}</p>
              <p style={{ margin: 0, fontSize: "12px", color: "#6B6B8A" }}>@{profile.username}</p>
            </div>
          </div>
        )}

        {/* Nav items */}
        {navItems.map(({ label, icon: Icon, href }) => (
          <button
            key={label}
            onClick={() => navigate(href)}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: "14px", padding: "13px 20px", background: "none", border: "none", cursor: "pointer", fontFamily: "'Inter', sans-serif", transition: "background 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1C1C2E")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <Icon size={20} color="#A3A3C2" strokeWidth={1.8} />
            <span style={{ fontSize: "15px", color: "#F1F5F9", fontWeight: 500 }}>{label}</span>
          </button>
        ))}

        {/* Become a Creator */}
        <button
          onClick={() => navigate("/become-a-creator")}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: "14px", padding: "13px 20px", background: "none", border: "none", cursor: "pointer", fontFamily: "'Inter', sans-serif", transition: "background 0.15s" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1C1C2E")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <Sparkles size={20} color="#8B5CF6" strokeWidth={1.8} />
          <span style={{ fontSize: "15px", color: "#8B5CF6", fontWeight: 500 }}>Become a Creator</span>
        </button>

        <div style={{ height: "1px", backgroundColor: "#1F1F2A", margin: "8px 0" }} />

        {/* Help */}
        <button
          onClick={() => navigate("/help")}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: "14px", padding: "13px 20px", background: "none", border: "none", cursor: "pointer", fontFamily: "'Inter', sans-serif", transition: "background 0.15s" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1C1C2E")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <HelpCircle size={20} color="#A3A3C2" strokeWidth={1.8} />
          <span style={{ fontSize: "15px", color: "#F1F5F9", fontWeight: 500 }}>Help & Support</span>
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: "14px", padding: "13px 20px", background: "none", border: "none", cursor: "pointer", fontFamily: "'Inter', sans-serif", transition: "background 0.15s" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1C1C2E")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <LogOut size={20} color="#EF4444" strokeWidth={1.8} />
          <span style={{ fontSize: "15px", color: "#EF4444", fontWeight: 500 }}>Log out</span>
        </button>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
    </>
  );
}