"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ConversationRow } from "@/components/messages/ConversationRow";
import type { Conversation } from "@/lib/types/messages";

export default function ArchivedPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchArchived = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations?archived=true");
      const data = await res.json();
      setConversations(data.conversations ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArchived();
  }, [fetchArchived]);

  // Re-fetch whenever archive/unarchive actions fire
  useEffect(() => {
    window.addEventListener("conversations-updated", fetchArchived);
    return () => window.removeEventListener("conversations-updated", fetchArchived);
  }, [fetchArchived]);

  return (
    <>
      <style>{`
        @media (max-width: 767px) {
          .archived-page {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            z-index: 100;
          }
        }
        @keyframes skeletonPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>

      <div
        className="archived-page"
        style={{
          width: "100%",
          height: "100vh",
          backgroundColor: "#0D0D1A",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "0 16px",
            height: "56px",
            flexShrink: 0,
            backgroundColor: "#13131F",
            borderBottom: "1px solid #1F1F2A",
          }}
        >
          <button
            onClick={() => router.push("/messages")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#A3A3C2",
              display: "flex",
              alignItems: "center",
              padding: "4px",
              borderRadius: "6px",
              transition: "color 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#A3A3C2")}
          >
            <ArrowLeft size={20} strokeWidth={1.8} />
          </button>
          <span style={{ fontSize: "18px", fontWeight: 700, color: "#FFFFFF" }}>
            Archived
          </span>
          <span style={{ fontSize: "14px", color: "#4A4A6A" }}>
            {conversations.length}
          </span>
        </div>

        {/* Info bar */}
        <div
          style={{
            padding: "10px 16px",
            borderBottom: "1px solid #1E1E2E",
            backgroundColor: "rgba(139,92,246,0.04)",
          }}
        >
          <p style={{ margin: 0, fontSize: "12px", color: "#4A4A6A", lineHeight: 1.4 }}>
            These chats stay archived when new messages are received.
          </p>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "14px 16px",
                    borderBottom: "1px solid #1E1E2E",
                  }}
                >
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "50%",
                      backgroundColor: "#1E1E2E",
                      flexShrink: 0,
                      animation: "skeletonPulse 1.4s ease-in-out infinite",
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div
                      style={{
                        width: "120px",
                        height: "14px",
                        borderRadius: "4px",
                        backgroundColor: "#1E1E2E",
                        animation: "skeletonPulse 1.4s ease-in-out infinite",
                        animationDelay: `${i * 0.12}s`,
                      }}
                    />
                    <div
                      style={{
                        width: "180px",
                        height: "12px",
                        borderRadius: "4px",
                        backgroundColor: "#1E1E2E",
                        animation: "skeletonPulse 1.4s ease-in-out infinite",
                        animationDelay: `${i * 0.14}s`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "60px 20px",
                gap: "8px",
              }}
            >
              <p style={{ margin: 0, fontSize: "14px", color: "#4A4A6A" }}>
                No archived chats
              </p>
            </div>
          ) : (
            conversations.map((conv) => (
              <ConversationRow
                key={conv.id}
                conversation={conv}
                isActive={false}
                onSelect={() => router.push(`/messages/${conv.id}?from=archived`)}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}