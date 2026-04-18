"use client";

import { useState, useEffect } from "react";
import { X, Ban, RefreshCw, ExternalLink, User as UserIcon } from "lucide-react";
import type { Subscription } from "@/lib/types/subscription";

interface Props {
  subscription:  Subscription;
  autoRenew:     boolean;
  autoBusy:      boolean;
  cancelBusy:    boolean;
  onToggleAutoRenew: () => void;
  onCancel:      () => Promise<boolean>;
  onClose:       () => void;
  onViewProfile: () => void;
}

export function ManageBottomSheet({
  subscription: s,
  autoRenew,
  autoBusy,
  cancelBusy,
  onToggleAutoRenew,
  onCancel,
  onClose,
  onViewProfile,
}: Props) {
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleCancel = async () => {
    const ok = await onCancel();
    if (ok) onClose();
  };

  const autoRenewDisabled = s.isFreeCreator || s.price === 0;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)",
          zIndex: 9998, animation: "freyaSheetFade 0.2s ease",
        }}
      />

      <style>{`
        @keyframes freyaSheetFade  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes freyaSheetSlide { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>

      <div
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          backgroundColor: "#0F0F1A",
          borderTopLeftRadius: "20px", borderTopRightRadius: "20px",
          border: "1px solid #1E1E2E", borderBottom: "none",
          zIndex: 9999,
          padding: "8px 0 max(20px, env(safe-area-inset-bottom)) 0",
          fontFamily: "'Inter', sans-serif",
          animation: "freyaSheetSlide 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
          maxHeight: "80vh", overflowY: "auto",
        }}
      >
        {/* Grab handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "4px 0 12px" }}>
          <div style={{ width: "36px", height: "4px", borderRadius: "2px", backgroundColor: "#2A2A3D" }} />
        </div>

        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "0 20px 16px", borderBottom: "1px solid #1E1E2E",
        }}>
          <div>
            <p style={{ fontSize: "15px", fontWeight: 700, color: "#F1F5F9", margin: 0 }}>Manage subscription</p>
            <p style={{ fontSize: "12px", color: "#6B6B8A", margin: "2px 0 0" }}>@{s.username}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: "32px", height: "32px", borderRadius: "50%",
              border: "none", backgroundColor: "#1C1C2E", color: "#94A3B8",
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Auto-renew */}
        {!autoRenewDisabled && (
          <button
            onClick={onToggleAutoRenew}
            disabled={autoBusy}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: "14px",
              padding: "16px 20px", background: "none", border: "none",
              borderBottom: "1px solid #1E1E2E", cursor: "pointer", textAlign: "left",
              fontFamily: "inherit", opacity: autoBusy ? 0.6 : 1,
            }}
          >
            <div style={{
              width: "36px", height: "36px", borderRadius: "10px",
              backgroundColor: "#1C1C2E", display: "flex", alignItems: "center",
              justifyContent: "center", color: "#8B5CF6",
            }}>
              <RefreshCw size={16} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: "14px", fontWeight: 600, color: "#F1F5F9", margin: 0 }}>Auto-renew</p>
              <p style={{ fontSize: "12px", color: "#6B6B8A", margin: "2px 0 0" }}>
                {autoRenew ? "Renews automatically from wallet" : "You'll need to renew manually"}
              </p>
            </div>
            <div style={{
              width: "42px", height: "24px", borderRadius: "12px", padding: "2px",
              backgroundColor: autoRenew ? "#8B5CF6" : "#2A2A3D",
              display: "flex", alignItems: "center",
              justifyContent: autoRenew ? "flex-end" : "flex-start",
              transition: "all 0.2s ease", flexShrink: 0,
            }}>
              <div style={{ width: "20px", height: "20px", borderRadius: "50%", backgroundColor: "#fff", transition: "all 0.2s ease" }} />
            </div>
          </button>
        )}

        {/* View profile */}
        <button
          onClick={onViewProfile}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: "14px",
            padding: "16px 20px", background: "none", border: "none",
            borderBottom: "1px solid #1E1E2E", cursor: "pointer", textAlign: "left",
            fontFamily: "inherit",
          }}
        >
          <div style={{
            width: "36px", height: "36px", borderRadius: "10px",
            backgroundColor: "#1C1C2E", display: "flex", alignItems: "center",
            justifyContent: "center", color: "#94A3B8",
          }}>
            <UserIcon size={16} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: "14px", fontWeight: 600, color: "#F1F5F9", margin: 0 }}>View profile</p>
            <p style={{ fontSize: "12px", color: "#6B6B8A", margin: "2px 0 0" }}>See posts, stories and more</p>
          </div>
          <ExternalLink size={14} color="#6B6B8A" />
        </button>

        {/* Cancel */}
        {!confirmCancel ? (
          <button
            onClick={() => setConfirmCancel(true)}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: "14px",
              padding: "16px 20px", background: "none", border: "none",
              cursor: "pointer", textAlign: "left", fontFamily: "inherit",
            }}
          >
            <div style={{
              width: "36px", height: "36px", borderRadius: "10px",
              backgroundColor: "rgba(239,68,68,0.12)", display: "flex",
              alignItems: "center", justifyContent: "center", color: "#EF4444",
            }}>
              <Ban size={16} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: "14px", fontWeight: 600, color: "#EF4444", margin: 0 }}>Cancel subscription</p>
              <p style={{ fontSize: "12px", color: "#6B6B8A", margin: "2px 0 0" }}>You'll keep access until {s.expiresAt}</p>
            </div>
          </button>
        ) : (
          <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <p style={{ fontSize: "13px", color: "#F1F5F9", margin: 0, textAlign: "center" }}>
              Cancel subscription to <strong>{s.creatorName}</strong>?
            </p>
            <p style={{ fontSize: "11px", color: "#6B6B8A", margin: 0, textAlign: "center" }}>
              You'll keep access until {s.expiresAt}
            </p>
            <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
              <button
                onClick={() => setConfirmCancel(false)}
                disabled={cancelBusy}
                style={{
                  flex: 1, padding: "11px", borderRadius: "10px",
                  border: "1px solid #2A2A3D", backgroundColor: "transparent",
                  color: "#94A3B8", fontSize: "13px", fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Keep it
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelBusy}
                style={{
                  flex: 1, padding: "11px", borderRadius: "10px",
                  border: "none", backgroundColor: "#EF4444",
                  color: "#fff", fontSize: "13px", fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit",
                  opacity: cancelBusy ? 0.6 : 1,
                }}
              >
                {cancelBusy ? "Cancelling…" : "Yes, cancel"}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}