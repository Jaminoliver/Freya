"use client";

import { useState } from "react";
import { BadgeCheck, Star } from "lucide-react";
import Image from "next/image";
import { useNav } from "@/lib/hooks/useNav";
import { AvatarWithStoryRing } from "@/components/ui/AvatarWithStoryRing";
import { useCreatorStory } from "@/lib/hooks/useCreatorStory";
import StoryViewer from "@/components/story/StoryViewer";
import CheckoutModal from "@/components/checkout/CheckoutModal";
import { ManageBottomSheet } from "./ManageBottomSheet";
import { useSubscriptionActions } from "@/lib/hooks/useSubscriptionActions";
import { STATUS_COLOR, STATUS_LABEL, type Subscription } from "@/lib/types/subscription";
import type { User } from "@/lib/types/profile";

export function SubscriptionCardDetailed({
  subscription: s,
  onRefresh,
  onTip,
}: {
  subscription: Subscription;
  onRefresh?:   () => void;
  onTip?:       (creatorId: string) => void;
}) {
  const { navigate } = useNav();

  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [manageOpen,      setManageOpen]      = useState(false);
  const [checkoutOpen,    setCheckoutOpen]    = useState(false);

  const { group: storyGroup, hasStory, hasUnviewed, refresh: refreshStory } = useCreatorStory(s.creatorId);

  const {
    isFavourite, autoRenew, starBusy, autoBusy, cancelBusy, freeResubBusy,
    toggleFavourite, toggleAutoRenew, freeResubscribe, cancelSubscription,
  } = useSubscriptionActions(s, onRefresh);

  const handleStar = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavourite();
  };

  const handleAvatarClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasStory && storyGroup) setStoryViewerOpen(true);
    else                        navigate(`/${s.username}`);
  };

  const handleMessage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const params = new URLSearchParams({
      targetUserId: s.creatorId,
      name:         s.creatorName,
      username:     s.username,
      avatar:       s.avatar_url ?? "",
      verified:     s.isVerified ? "1" : "0",
    });
    navigate(`/messages/new?${params.toString()}`);
  };

  const handleTip = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onTip?.(s.creatorId);
  };

  const handleResub = () => {
    if (s.isFreeCreator) freeResubscribe();
    else                 setCheckoutOpen(true);
  };

  const creatorForCheckout: User = {
    id:           s.creatorId,
    username:     s.username,
    display_name: s.creatorName,
    avatar_url:   s.avatar_url,
    is_verified:  s.isVerified,
    banner_url:   s.banner_url,
  } as unknown as User;

  const iconButtonStyle: React.CSSProperties = {
    width: "46px", height: "42px", borderRadius: "10px",
    border: "1px solid #2A2A3D", backgroundColor: "transparent",
    color: "#C4C4D4", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0, transition: "all 0.15s ease",
  };

  const renderButton = () => {
    const base: React.CSSProperties = {
      width: "100%", padding: "8px", borderRadius: "10px",
      border: "none", cursor: "pointer",
      fontSize: "13px", fontWeight: 700,
      fontFamily: "'Inter', sans-serif",
    };

    if (s.status === "active") {
      return (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setManageOpen(true); }}
          style={{
            ...base,
            background: "#1E1E2E",
            border: "1px solid #3A3A4D",
            color: "#A78BFA",
          }}
        >
          Manage
        </button>
      );
    }

    if (s.status === "attention") {
      return (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleResub(); }}
          disabled={freeResubBusy}
          style={{ ...base, backgroundColor: "#F59E0B", color: "#0A0A0F", opacity: freeResubBusy ? 0.6 : 1 }}
        >
          {freeResubBusy ? "..." : "Renew now"}
        </button>
      );
    }

    return (
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleResub(); }}
        disabled={freeResubBusy}
        style={{ ...base, background: "linear-gradient(135deg, #8B5CF6, #EC4899)", color: "#fff", opacity: freeResubBusy ? 0.6 : 1 }}
      >
        {freeResubBusy ? "..." : s.isFreeCreator ? "Resubscribe for free" : "Resubscribe"}
      </button>
    );
  };

  return (
    <>
      {storyViewerOpen && storyGroup && (
        <StoryViewer groups={[storyGroup]} startGroupIndex={0} onClose={() => { setStoryViewerOpen(false); refreshStory(); }} />
      )}

      {checkoutOpen && (
        <CheckoutModal
          isOpen={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          type="subscription"
          creator={creatorForCheckout}
          monthlyPrice={s.monthlyPrice}
          threeMonthPrice={s.threeMonthPrice ?? undefined}
          sixMonthPrice={s.sixMonthPrice ?? undefined}
          autoCloseOnSuccess
          onSubscriptionSuccess={() => onRefresh?.()}
        />
      )}

      {manageOpen && (
        <ManageBottomSheet
          subscription={s}
          autoRenew={autoRenew}
          autoBusy={autoBusy}
          cancelBusy={cancelBusy}
          onToggleAutoRenew={toggleAutoRenew}
          onCancel={cancelSubscription}
          onClose={() => setManageOpen(false)}
          onViewProfile={() => { setManageOpen(false); navigate(`/${s.username}`); }}
        />
      )}

      <div style={{
        backgroundColor: "#0D0D18",
        border:          "1px solid #1E1E2E",
        borderRadius:    "14px",
        overflow:        "hidden",
        fontFamily:      "'Inter', sans-serif",
        position:        "relative",
      }}>
        {/* Banner */}
        <div
          onClick={() => navigate(`/${s.username}`)}
          style={{ position: "relative", height: "140px", cursor: "pointer" }}
        >
          {s.banner_url ? (
            <Image src={s.banner_url} alt={s.creatorName} fill sizes="(max-width: 768px) 100vw, 640px" style={{ objectFit: "cover" }} />
          ) : (
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #312E81, #7C2D62)" }} />
          )}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.65) 100%)" }} />

          {/* Top-left badges */}
          <div style={{ position: "absolute", top: "10px", left: "10px", display: "flex", gap: "6px" }}>
            {s.isFreeCreator && (
              <span style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)", borderRadius: "20px", padding: "3px 10px", fontSize: "10px", fontWeight: 700, color: "#fff" }}>Free</span>
            )}
            {s.newPosts > 0 && (
              <span style={{ backgroundColor: "rgba(139,92,246,0.85)", backdropFilter: "blur(6px)", borderRadius: "20px", padding: "3px 10px", fontSize: "10px", fontWeight: 700, color: "#fff" }}>
                {s.newPosts} new
              </span>
            )}
          </div>

          {/* Star */}
          <button
            onClick={handleStar}
            disabled={starBusy}
            aria-label={isFavourite ? "Unstar" : "Star"}
            style={{
              position: "absolute", top: "10px", right: "10px",
              width: "32px", height: "32px", borderRadius: "50%",
              backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)",
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Star
              size={15}
              strokeWidth={1.8}
              fill={isFavourite ? "#F59E0B" : "none"}
              color={isFavourite ? "#F59E0B" : "#fff"}
            />
          </button>

          {/* Avatar + name */}
          <div style={{ position: "absolute", bottom: "12px", left: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
            <AvatarWithStoryRing
              src={s.avatar_url}
              alt={s.creatorName}
              size={64}
              hasStory={hasStory}
              hasUnviewed={hasUnviewed}
              onClick={handleAvatarClick}
              borderColor="#0D0D18"
            />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ fontSize: "16px", fontWeight: 700, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>{s.creatorName}</span>
                {s.isVerified && <BadgeCheck size={14} color="#A78BFA" />}
              </div>
              <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.75)" }}>@{s.username}</span>
            </div>
          </div>

          {/* Status pill */}
          <div style={{
            position: "absolute", bottom: "12px", right: "12px",
            display: "flex", alignItems: "center", gap: "6px",
            backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)",
            padding: "4px 10px", borderRadius: "16px",
          }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: STATUS_COLOR[s.status], boxShadow: `0 0 6px ${STATUS_COLOR[s.status]}` }} />
            <span style={{ fontSize: "10px", fontWeight: 600, color: "#fff" }}>{STATUS_LABEL[s.status]}</span>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "12px 14px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontSize: "11px", color: "#6B6B8A" }}>
              {s.status === "active" ? "Expires" : s.status === "attention" ? "Renew by" : "Expired"} {s.expiresAt}
            </span>
            {!s.isFreeCreator && s.price > 0 && (
              <span style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 600 }}>
                ₦{(s.price / 100).toLocaleString("en-NG")}
              </span>
            )}
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <div style={{ flex: 1 }}>{renderButton()}</div>
            {s.status === "active" && (
              <>
                {/* Tip button */}
                <button
                  onClick={handleTip}
                  aria-label="Tip"
                  style={iconButtonStyle}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#8B5CF6"; e.currentTarget.style.color = "#8B5CF6"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2A3D"; e.currentTarget.style.color = "#C4C4D4"; }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 12 20 22 4 22 4 12"/>
                    <rect x="2" y="7" width="20" height="5"/>
                    <line x1="12" y1="22" x2="12" y2="7"/>
                    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
                    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
                  </svg>
                </button>

                {/* Message button */}
                <button
                  onClick={handleMessage}
                  aria-label="Message"
                  style={iconButtonStyle}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#8B5CF6"; e.currentTarget.style.color = "#8B5CF6"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2A3D"; e.currentTarget.style.color = "#C4C4D4"; }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}