"use client";

import Image from "next/image";
import { Lock } from "lucide-react";

interface PPVScreenProps {
  postPrice: number;
  postThumbnail?: string | null;
  creatorName: string;
  creatorAvatar?: string | null;
  walletBalance: number;
  onConfirm: () => void;
  onClose: () => void;
}

export function PPVScreen({
  postPrice,
  postThumbnail,
  creatorName,
  creatorAvatar,
  walletBalance,
  onConfirm,
  onClose,
}: PPVScreenProps) {
  const hasEnoughBalance = walletBalance >= postPrice;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>

      {/* Blurred preview */}
      <div style={{
        position: "relative",
        width: "100%",
        aspectRatio: "16/9",
        backgroundColor: "#0D0D18",
        overflow: "hidden",
        borderRadius: "12px",
        marginBottom: "20px",
      }}>
        {postThumbnail ? (
          <Image
            src={postThumbnail}
            alt="Locked content preview"
            fill
            style={{
              objectFit: "cover",
              filter: "blur(18px)",
              transform: "scale(1.08)",
            }}
          />
        ) : (
          <div style={{
            width: "100%",
            height: "100%",
            background: "linear-gradient(135deg, #1A1A2E 0%, #2A1A3E 100%)",
          }} />
        )}

        {/* Lock overlay */}
        <div style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.45)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
        }}>
          <div style={{
            width: "52px",
            height: "52px",
            borderRadius: "50%",
            backgroundColor: "rgba(139,92,246,0.25)",
            border: "2px solid rgba(139,92,246,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <Lock size={22} color="#A78BFA" strokeWidth={2} />
          </div>
          <div style={{
            fontSize: "22px",
            fontWeight: 700,
            color: "#fff",
            fontFamily: "'Inter', sans-serif",
            letterSpacing: "-0.5px",
          }}>
            ₦{postPrice.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Creator info */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        marginBottom: "16px",
      }}>
        <div style={{
          width: "38px",
          height: "38px",
          borderRadius: "50%",
          overflow: "hidden",
          backgroundColor: "#2A2A3D",
          flexShrink: 0,
          position: "relative",
        }}>
          {creatorAvatar ? (
            <Image src={creatorAvatar} alt={creatorName} fill style={{ objectFit: "cover" }} />
          ) : (
            <div style={{
              width: "100%", height: "100%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "16px", fontWeight: 700, color: "#8B5CF6",
              fontFamily: "'Inter', sans-serif",
            }}>
              {creatorName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div>
          <div style={{ fontSize: "14px", fontWeight: 600, color: "#E2E8F0", fontFamily: "'Inter', sans-serif" }}>
            {creatorName}
          </div>
          <div style={{ fontSize: "12px", color: "#6B6B8A", fontFamily: "'Inter', sans-serif", marginTop: "1px" }}>
            Exclusive content
          </div>
        </div>
      </div>

      {/* Price summary */}
      <div style={{
        backgroundColor: "#0D0D18",
        border: "1.5px solid #2A2A3D",
        borderRadius: "12px",
        padding: "14px 16px",
        marginBottom: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "13px", color: "#8A8AA0", fontFamily: "'Inter', sans-serif" }}>Unlock price</span>
          <span style={{ fontSize: "14px", fontWeight: 600, color: "#E2E8F0", fontFamily: "'Inter', sans-serif" }}>
            ₦{postPrice.toLocaleString()}
          </span>
        </div>
        <div style={{ height: "1px", backgroundColor: "#2A2A3D" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "13px", color: "#8A8AA0", fontFamily: "'Inter', sans-serif" }}>Wallet balance</span>
          <span style={{
            fontSize: "14px",
            fontWeight: 600,
            color: hasEnoughBalance ? "#34D399" : "#FF6B6B",
            fontFamily: "'Inter', sans-serif",
          }}>
            ₦{walletBalance.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Low balance warning */}
      {!hasEnoughBalance && (
        <div style={{
          backgroundColor: "rgba(255,107,107,0.1)",
          border: "1px solid rgba(255,107,107,0.3)",
          borderRadius: "10px",
          padding: "10px 14px",
          marginBottom: "16px",
          fontSize: "13px",
          color: "#FF6B6B",
          fontFamily: "'Inter', sans-serif",
          textAlign: "center",
        }}>
          Insufficient wallet balance. Top up to unlock this content.
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: "10px" }}>
        <button
          onClick={onClose}
          style={{
            flex: 1,
            padding: "13px",
            borderRadius: "12px",
            border: "1.5px solid #2A2A3D",
            backgroundColor: "transparent",
            color: "#A3A3C2",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={!hasEnoughBalance}
          style={{
            flex: 2,
            padding: "13px",
            borderRadius: "12px",
            border: "none",
            backgroundColor: hasEnoughBalance ? "#8B5CF6" : "#2A2A3D",
            color: hasEnoughBalance ? "#fff" : "#6B6B8A",
            fontSize: "14px",
            fontWeight: 700,
            cursor: hasEnoughBalance ? "pointer" : "not-allowed",
            fontFamily: "'Inter', sans-serif",
            transition: "opacity 0.15s",
          }}
        >
          {hasEnoughBalance ? `Unlock for ₦${postPrice.toLocaleString()}` : "Top up wallet"}
        </button>
      </div>

    </div>
  );
}