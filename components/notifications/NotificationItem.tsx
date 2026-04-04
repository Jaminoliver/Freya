"use client";

import { Heart, MessageCircle, Banknote, UserPlus, Lock, RefreshCcw, Wallet, AlertCircle, CheckCircle, Send } from "lucide-react";
import type { NotificationItem as NotificationItemType } from "@/lib/types/notifications";

interface Props {
  notification: NotificationItemType;
  onClick?:     () => void;
}

function parseReferenceId(raw?: string | null): Record<string, string> | null {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function TypeIcon({ type }: { type: NotificationItemType["type"] }) {
  const configs: Record<NotificationItemType["type"], { icon: React.ElementType; bg: string; color: string }> = {
    like:                   { icon: Heart,         bg: "#2A1A1A", color: "#EC4899" },
    comment_liked:          { icon: Heart,         bg: "#2A1A1A", color: "#EC4899" },
    comment:                { icon: MessageCircle, bg: "#1A2028", color: "#3B82F6" },
    subscription:           { icon: UserPlus,      bg: "#1A1A2E", color: "#8B5CF6" },
    resubscription:         { icon: RefreshCcw,    bg: "#1A1A2E", color: "#8B5CF6" },
    tip_received:           { icon: Banknote,      bg: "#1A2A1A", color: "#10B981" },
    ppv_unlocked:           { icon: Lock,          bg: "#2A2A10", color: "#F5A623" },
    ppv_purchased:          { icon: Lock,          bg: "#2A2A10", color: "#F5A623" },
    payout_completed:       { icon: CheckCircle,   bg: "#1A2A1A", color: "#10B981" },
    payout_failed:          { icon: AlertCircle,   bg: "#2A1A1A", color: "#EF4444" },
    subscription_activated: { icon: CheckCircle,   bg: "#1A1A2E", color: "#8B5CF6" },
    subscription_cancelled: { icon: AlertCircle,   bg: "#2A1A1A", color: "#EF4444" },
    renewal_failed:         { icon: AlertCircle,   bg: "#2A1A1A", color: "#EF4444" },
    renewal_success:        { icon: CheckCircle,   bg: "#1A2A1A", color: "#10B981" },
    subscription_charged:   { icon: Banknote,      bg: "#1A1A2E", color: "#8B5CF6" },
    tip_sent:               { icon: Send,          bg: "#1A2A1A", color: "#10B981" },
    wallet_topup:           { icon: Wallet,        bg: "#1A2028", color: "#3B82F6" },
    message:                { icon: MessageCircle, bg: "#1A1A2E", color: "#8B5CF6" },
  };

  const { icon: Icon, bg, color } = configs[type];

  return (
    <div style={{
      width: "22px", height: "22px", borderRadius: "50%",
      backgroundColor: bg, display: "flex", alignItems: "center",
      justifyContent: "center", flexShrink: 0,
      position: "absolute", bottom: "-2px", right: "-2px",
      border: "2px solid #0A0A0F",
    }}>
      <Icon size={11} color={color} strokeWidth={2.2} />
    </div>
  );
}

export function NotificationItem({ notification, onClick }: Props) {
  const { actorName, actorAvatar, bodyText, subText, createdAt, isUnread, type, referenceId } = notification;

  const parsed      = parseReferenceId(referenceId as string | undefined);
  const isStoryLike = type === "like" && parsed?.kind === "story";
  const isPostNotif = ["like","comment","ppv_unlocked","ppv_purchased","tip_received","tip_sent"].includes(type) && parsed?.kind === "post";
  const thumbnail   = (isStoryLike || isPostNotif) ? parsed?.thumbnail : null;

  const thumbAspect = isStoryLike
    ? { width: "56px", height: "72px" }   // portrait for stories
    : { width: "56px", height: "56px" };  // square for posts

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: "14px",
        padding: "14px 20px", borderBottom: "1px solid #1A1A2A",
        cursor: "pointer",
        backgroundColor: isUnread ? "rgba(139,92,246,0.04)" : "transparent",
        transition: "background-color 0.15s ease",
        position: "relative",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#111120")}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = isUnread ? "rgba(139,92,246,0.04)" : "transparent")}
    >
      {/* Unread left bar */}
      {isUnread && (
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0,
          width: "3px", backgroundColor: "#8B5CF6", borderRadius: "0 2px 2px 0",
        }} />
      )}

      {/* Avatar + type icon */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <div style={{
          width: "48px", height: "48px", borderRadius: "50%",
          overflow: "hidden", backgroundColor: "#2A2A3D",
        }}>
          {actorAvatar ? (
            <img src={actorAvatar} alt={actorName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{
              width: "100%", height: "100%", backgroundColor: "#8B5CF6",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#FFFFFF", fontSize: "18px", fontWeight: 700,
            }}>
              {actorName[0]?.toUpperCase()}
            </div>
          )}
        </div>
        <TypeIcon type={type} />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: "0 0 3px", fontSize: "14px", color: "#FFFFFF", lineHeight: 1.4 }}>
          {actorName && (
            <><span style={{ fontWeight: 700 }}>{actorName}</span>{" "}</>
          )}
          <span style={{ color: actorName ? "#C4C4D4" : "#FFFFFF" }}>{bodyText}</span>
        </p>
        <p style={{ margin: 0, fontSize: "13px", color: "#6B6B8A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {subText}
        </p>
      </div>

      {/* Right — thumbnail + time OR timestamp+dot */}
      {thumbnail ? (
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          <div style={{
            ...thumbAspect,
            borderRadius: "6px",
            overflow: "hidden", border: "1px solid #2A2A3D", flexShrink: 0,
          }}>
            <img src={thumbnail} alt="media" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <span style={{ fontSize: "12px", color: "#4A4A6A", whiteSpace: "nowrap" }}>{createdAt}</span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px", flexShrink: 0 }}>
          <span style={{ fontSize: "12px", color: "#4A4A6A", whiteSpace: "nowrap" }}>{createdAt}</span>
          {isUnread && (
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#8B5CF6" }} />
          )}
        </div>
      )}
    </div>
  );
}