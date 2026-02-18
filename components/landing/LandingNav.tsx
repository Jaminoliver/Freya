"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <nav style={{ width: "100%", padding: "16px 24px", backgroundColor: "#0A0A0F" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {/* Logo */}
        <Link href="/" style={{ fontSize: "24px", fontWeight: 700, color: "#8B5CF6", textDecoration: "none" }}>
          Freya
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex" style={{ alignItems: "center", gap: "32px" }}>
          <Link href="#features" style={{ fontSize: "16px", color: "#A3A3C2", textDecoration: "none" }}>Features</Link>
          <Link href="#creators" style={{ fontSize: "16px", color: "#A3A3C2", textDecoration: "none" }}>Creators</Link>
          <Link href="#pricing" style={{ fontSize: "16px", color: "#A3A3C2", textDecoration: "none" }}>Pricing</Link>
        </div>

        {/* Desktop auth buttons */}
        <div className="hidden md:flex" style={{ alignItems: "center", gap: "16px" }}>
          <Link href="/login" style={{ fontSize: "16px", color: "#A3A3C2", textDecoration: "none" }}>Log In</Link>
          <Link href="/signup" style={{ fontSize: "16px", fontWeight: 600, color: "#FFFFFF", backgroundColor: "#8B5CF6", padding: "8px 24px", borderRadius: "8px", textDecoration: "none" }}>Sign Up</Link>
        </div>

        {/* Mobile hamburger */}
        <button className="md:hidden" onClick={() => setOpen(!open)} style={{ background: "none", border: "none", cursor: "pointer", color: "#F1F5F9" }}>
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden" style={{ padding: "16px 24px", backgroundColor: "#141420", borderTop: "1px solid #2A2A3D", display: "flex", flexDirection: "column", gap: "16px" }}>
          <Link href="#features" onClick={() => setOpen(false)} style={{ fontSize: "16px", color: "#A3A3C2", textDecoration: "none" }}>Features</Link>
          <Link href="#creators" onClick={() => setOpen(false)} style={{ fontSize: "16px", color: "#A3A3C2", textDecoration: "none" }}>Creators</Link>
          <Link href="#pricing" onClick={() => setOpen(false)} style={{ fontSize: "16px", color: "#A3A3C2", textDecoration: "none" }}>Pricing</Link>
          <hr style={{ borderColor: "#2A2A3D" }} />
          <Link href="/login" onClick={() => setOpen(false)} style={{ fontSize: "16px", color: "#A3A3C2", textDecoration: "none" }}>Log In</Link>
          <Link href="/signup" onClick={() => setOpen(false)} style={{ fontSize: "16px", fontWeight: 600, color: "#FFFFFF", backgroundColor: "#8B5CF6", padding: "12px 24px", borderRadius: "8px", textDecoration: "none", textAlign: "center" }}>Sign Up</Link>
        </div>
      )}
    </nav>
  );
}