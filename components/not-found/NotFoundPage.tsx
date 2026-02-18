"use client";

import Link from "next/link";

export function NotFoundPage() {
  return (
    <div style={{
      width: "100%",
      minHeight: "100vh",
      backgroundColor: "#0A0A0F",
      fontFamily: "'Inter', sans-serif",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      padding: "0 24px",
      boxSizing: "border-box",
    }}>
      {/* 404 */}
      <h1 style={{
        fontSize: "clamp(100px, 20vw, 180px)",
        fontWeight: 800,
        margin: "0 0 8px",
        lineHeight: 1,
        background: "linear-gradient(90deg, #8B5CF6, #EC4899)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
        letterSpacing: "-4px",
      }}>
        404
      </h1>

      <h2 style={{ color: "#F1F5F9", fontSize: "22px", fontWeight: 700, margin: "0 0 10px" }}>
        Page Not Found
      </h2>

      <p style={{ color: "#6B6B8A", fontSize: "14px", margin: "0 0 32px", maxWidth: "320px", lineHeight: 1.6 }}>
        The page you're looking for doesn't exist or has been moved.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%", maxWidth: "320px" }}>
        <Link href="/" style={{
          display: "block",
          width: "100%",
          borderRadius: "12px",
          padding: "16px",
          fontSize: "15px",
          fontWeight: 700,
          textAlign: "center",
          textDecoration: "none",
          backgroundColor: "#8B5CF6",
          color: "#FFFFFF",
          boxShadow: "0 4px 24px rgba(139, 92, 246, 0.35)",
          boxSizing: "border-box",
        }}>
          Go Home
        </Link>

        <Link href="/explore" style={{
          display: "block",
          width: "100%",
          borderRadius: "12px",
          padding: "16px",
          fontSize: "15px",
          fontWeight: 600,
          textAlign: "center",
          textDecoration: "none",
          backgroundColor: "#141420",
          border: "1.5px solid #1F1F2A",
          color: "#A3A3C2",
          boxSizing: "border-box",
        }}>
          Explore Creators
        </Link>
      </div>
    </div>
  );
}