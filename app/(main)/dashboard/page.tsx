"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Profile {
  display_name: string;
  username: string;
  role: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data } = await supabase.from("profiles").select("display_name, username, role").eq("id", user.id).single();
      setProfile(data);
      setLoading(false);
    };
    fetchProfile();
  }, [router]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#0A0A0F", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "40px", height: "40px", borderRadius: "50%", border: "3px solid #1F1F2A", borderTop: "3px solid #8B5CF6", animation: "spin 0.9s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const firstLetter = profile?.display_name?.charAt(0).toUpperCase() ?? "?";

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0A0A0F", fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px" }}>
      {/* Avatar */}
      <div style={{ width: "88px", height: "88px", borderRadius: "50%", background: "linear-gradient(135deg, #8B5CF6, #EC4899)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px", fontSize: "36px", fontWeight: 700, color: "#fff" }}>
        {firstLetter}
      </div>

      {/* Name */}
      <h1 style={{ margin: "0 0 6px", fontSize: "22px", fontWeight: 700, color: "#F1F5F9" }}>
        {profile?.display_name ?? "—"}
      </h1>

      {/* Username */}
      <p style={{ margin: "0 0 8px", fontSize: "14px", color: "#A3A3C2" }}>@{profile?.username ?? "—"}</p>

      {/* Role badge */}
      <span style={{ display: "inline-block", padding: "4px 12px", borderRadius: "50px", backgroundColor: "#141420", border: "1px solid #1F1F2A", fontSize: "12px", color: "#8B5CF6", fontWeight: 600, textTransform: "capitalize", marginBottom: "32px" }}>
        {profile?.role ?? "fan"}
      </span>

      {/* Sign out */}
      <button onClick={handleSignOut} style={{ padding: "12px 28px", borderRadius: "10px", backgroundColor: "#141420", border: "1.5px solid #1F1F2A", color: "#A3A3C2", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>
        Sign Out
      </button>
    </div>
  );
}